#!/usr/bin/env python3
"""Assemble an unsigned APK without the Android SDK.

Writes the binary AndroidManifest.xml, a tiny resources.arsc (app icon as a plain PNG plus an
adaptive icon for Android 8+), and zips them with classes.dex and the assets folder.

usage: mkapk.py OUT.apk CLASSES.dex ASSETS_DIR ICON_DIR VERSION_CODE VERSION_NAME
ICON_DIR holds icon.png (legacy), icon_fg.png and icon_bg.png (adaptive layers, 108dp grid).
"""
import os, struct, sys, zipfile

PKG = 'ie.belfast.wheel'
LABEL = 'Wheel of Life'
ANDROID_NS = 'http://schemas.android.com/apk/res/android'

ATTR = {  # android:attr ids (from android.jar R$attr)
    'theme': 0x01010000, 'label': 0x01010001, 'icon': 0x01010002, 'name': 0x01010003,
    'exported': 0x01010010, 'authorities': 0x01010018, 'grantUriPermissions': 0x0101001b,
    'launchMode': 0x0101001d, 'screenOrientation': 0x0101001e, 'configChanges': 0x0101001f,
    'minSdkVersion': 0x0101020c, 'versionCode': 0x0101021b, 'versionName': 0x0101021c,
    'targetSdkVersion': 0x01010270, 'allowBackup': 0x01010280, 'drawable': 0x01010199,
    'hardwareAccelerated': 0x010102d3,
}
T_REF, T_STR, T_DEC, T_HEX, T_BOOL = 0x01, 0x03, 0x10, 0x11, 0x12
THEME_FULLSCREEN = 0x0103000a  # @android:style/Theme.Black.NoTitleBar.Fullscreen
R_ICON, R_ICON_FG, R_ICON_BG = 0x7f010000, 0x7f010001, 0x7f010002


def pad4(b):
    return b + b'\0' * (-len(b) % 4)


def string_pool(strings):
    """UTF-16 string pool chunk."""
    data, offs = b'', []
    for s in strings:
        offs.append(len(data))
        u = s.encode('utf-16-le')
        data += struct.pack('<H', len(s)) + u + b'\0\0'
    data = pad4(data)
    hdr = 28
    start = hdr + 4 * len(strings)
    body = b''.join(struct.pack('<I', o) for o in offs) + data
    return struct.pack('<HHIIIIII', 0x0001, hdr, hdr + len(body), len(strings), 0, 0, start, 0) + body


class Xml:
    """Binary XML writer. Elements: (tag, [(ns, attr, value)], [children]); value is str, int, bool or ('ref', id)."""

    def __init__(self, root):
        self.root = root
        attrs = set()
        self._walk(root, lambda e: attrs.update(a for ns, a, v in e[1] if ns))
        self.res_names = sorted(attrs, key=lambda a: ATTR[a])  # resource-id strings first, in map order
        self.strings = list(self.res_names)

    def _walk(self, e, fn):
        fn(e)
        for c in e[2]:
            self._walk(c, fn)

    def s(self, x):
        if x not in self.strings:
            self.strings.append(x)
        return self.strings.index(x)

    def _elem(self, e, out):
        tag, attrs, kids = e
        def key(a):
            return ATTR[a[1]] if a[0] else 0x7fffffff
        recs = b''
        for ns, name, v in sorted(attrs, key=key):
            nsi = self.s(ANDROID_NS) if ns else 0xffffffff
            if isinstance(v, bool):
                raw, typ, data = 0xffffffff, T_BOOL, 0xffffffff if v else 0
            elif isinstance(v, int):
                raw, typ, data = 0xffffffff, T_DEC, v
            elif isinstance(v, tuple) and v[0] == 'ref':
                raw, typ, data = 0xffffffff, T_REF, v[1]
            elif isinstance(v, tuple) and v[0] == 'hex':
                raw, typ, data = 0xffffffff, T_HEX, v[1]
            else:
                raw = self.s(v); typ, data = T_STR, raw
            recs += struct.pack('<IIIHBBI', nsi, self.s(name), raw, 8, 0, typ, data)
        body = struct.pack('<IIHHHHHH', 0xffffffff, self.s(tag), 20, 20, len(attrs), 0, 0, 0) + recs
        out.append(struct.pack('<HHIII', 0x0102, 16, 16 + len(body), 1, 0xffffffff) + body)
        for k in kids:
            self._elem(k, out)
        out.append(struct.pack('<HHIIIII', 0x0103, 16, 24, 1, 0xffffffff, 0xffffffff, self.s(tag)))

    def build(self):
        out = []
        self._elem(self.root, out)  # first pass fills the string pool
        out = []
        pre, uri = self.s('android'), self.s(ANDROID_NS)
        self._elem(self.root, out)
        ns_start = struct.pack('<HHIIIII', 0x0100, 16, 24, 1, 0xffffffff, pre, uri)
        ns_end = struct.pack('<HHIIIII', 0x0101, 16, 24, 1, 0xffffffff, pre, uri)
        rmap = b''.join(struct.pack('<I', ATTR[a]) for a in self.res_names)
        rmap = struct.pack('<HHI', 0x0180, 8, 8 + len(rmap)) + rmap
        body = string_pool(self.strings) + rmap + ns_start + b''.join(out) + ns_end
        return struct.pack('<HHI', 0x0003, 8, 8 + len(body)) + body


def manifest(vcode, vname):
    A = True
    app = ('application', [
        (A, 'label', LABEL), (A, 'icon', ('ref', R_ICON)), (A, 'theme', ('ref', THEME_FULLSCREEN)),
        (A, 'allowBackup', True), (A, 'hardwareAccelerated', True)], [
        ('activity', [
            (A, 'name', PKG + '.MainActivity'), (A, 'exported', True), (A, 'launchMode', 2),  # singleTask
            (A, 'screenOrientation', 1),  # portrait
            (A, 'configChanges', ('hex', 0x04a0 | 0x0400 | 0x0080 | 0x0020 | 0x0010 | 0x0100 | 0x0200 | 0x0800 | 0x1000))], [
            ('intent-filter', [], [
                ('action', [(A, 'name', 'android.intent.action.MAIN')], []),
                ('category', [(A, 'name', 'android.intent.category.LAUNCHER')], [])])]),
        ('provider', [
            (A, 'name', PKG + '.CamProvider'), (A, 'authorities', PKG + '.cam'),
            (A, 'exported', False), (A, 'grantUriPermissions', True)], [])])
    root = ('manifest', [(None, 'package', PKG), (A, 'versionCode', vcode), (A, 'versionName', vname)], [
        ('uses-sdk', [(A, 'minSdkVersion', 24), (A, 'targetSdkVersion', 35)], []),
        ('uses-permission', [(A, 'name', 'android.permission.INTERNET')], []),
        ('uses-permission', [(A, 'name', 'android.permission.REQUEST_INSTALL_PACKAGES')], []),
        ('uses-permission', [(A, 'name', 'android.permission.VIBRATE')], []),
        ('uses-permission', [(A, 'name', 'android.permission.WAKE_LOCK')], []),
        ('queries', [], [('package', [(A, 'name', 'com.revolut.revolut')], [])]),
        app])
    return Xml(root).build()


def adaptive_icon():
    A = True
    root = ('adaptive-icon', [], [
        ('background', [(A, 'drawable', ('ref', R_ICON_BG))], []),
        ('foreground', [(A, 'drawable', ('ref', R_ICON_FG))], [])])
    return Xml(root).build()


def res_table(paths_default, path_v26_icon):
    """drawable/icon, icon_fg, icon_bg as files; drawable-anydpi-v26/icon as the adaptive XML."""
    gstr = list(paths_default) + [path_v26_icon]
    keys = ['icon', 'icon_fg', 'icon_bg']
    n = len(keys)

    def config(density=0, sdk=0):
        c = struct.pack('<I', 64) + b'\0' * 8 + struct.pack('<BBH', 0, 0, density) + b'\0' * 8 + struct.pack('<HH', sdk, 0)
        return c + b'\0' * (64 - len(c))

    def type_chunk(cfg, values):  # values[i]: global string index of entry i's file, or None
        offs, entries = [], b''
        for i, v in enumerate(values):
            if v is None:
                offs.append(0xffffffff); continue
            offs.append(len(entries))
            entries += struct.pack('<HHI', 8, 0, i) + struct.pack('<HBBI', 8, 0, T_STR, v)
        hdr = 20 + len(cfg)
        start = hdr + 4 * n
        body = cfg + b''.join(struct.pack('<I', o) for o in offs) + entries
        return struct.pack('<HHIBBHII', 0x0201, hdr, start + len(entries), 1, 0, 0, n, start) + body

    spec = struct.pack('<HHIBBHI', 0x0202, 16, 16 + 4 * n, 1, 0, 0, n) + struct.pack('<I', 0) * n
    t_default = type_chunk(config(), [0, 1, 2])
    t_v26 = type_chunk(config(density=0xfffe, sdk=26), [3, None, None])
    types = string_pool(['drawable'])
    keyp = string_pool(keys)
    name = PKG.encode('utf-16-le')
    name += b'\0' * (256 - len(name))
    phdr = 288
    pbody = types + keyp + spec + t_default + t_v26
    pkg = struct.pack('<HHII', 0x0200, phdr, phdr + len(pbody), 0x7f) + name + struct.pack(
        '<IIIII', phdr, 1, phdr + len(types), n, 0) + pbody
    body = string_pool(gstr) + pkg
    return struct.pack('<HHII', 0x0002, 12, 12 + len(body), 1) + body


def add(z, name, data, stored):
    """Write one entry; stored entries get their data 4-byte aligned (Android needs this for resources.arsc)."""
    zi = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
    zi.compress_type = zipfile.ZIP_STORED if stored else zipfile.ZIP_DEFLATED
    if stored:
        start = z.fp.tell() + 30 + len(name.encode())
        pad = (-(start + 6)) % 4
        zi.extra = struct.pack('<HHH', 0xd935, 2 + pad, 4) + b'\0' * pad  # same extra field zipalign uses
    z.writestr(zi, data)


def main():
    out, dex, assets, icons, vcode, vname = sys.argv[1:7]
    files = {'res/drawable/icon.png': 'icon.png', 'res/drawable/icon_fg.png': 'icon_fg.png', 'res/drawable/icon_bg.png': 'icon_bg.png'}
    v26 = 'res/drawable-anydpi-v26/icon.xml'
    rd = lambda p: open(p, 'rb').read()
    with zipfile.ZipFile(out, 'w') as z:
        add(z, 'AndroidManifest.xml', manifest(int(vcode), vname), False)
        add(z, 'resources.arsc', res_table(list(files), v26), True)
        add(z, 'classes.dex', rd(dex), False)
        for dst, src in files.items():
            add(z, dst, rd(os.path.join(icons, src)), True)
        add(z, v26, adaptive_icon(), False)
        for root, _, names in sorted(os.walk(assets)):
            for f in sorted(names):
                p = os.path.join(root, f)
                add(z, 'assets/' + os.path.relpath(p, assets).replace(os.sep, '/'), rd(p), False)


if __name__ == '__main__':
    main()
