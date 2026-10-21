package ie.belfast.wheel;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

// Full-screen WebView around the game in assets/index.html. Everything is offline.
public class MainActivity extends Activity {
    private static final int PICK = 7;
    private static final int IMMERSIVE = 0x00000002 | 0x00000004 | 0x00000100 | 0x00000200 | 0x00000400 | 0x00001000;

    private WebView web;
    private ValueCallback<Uri[]> pending;
    private Uri camUri;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        try { // draw into the camera notch area (API 28+)
            WindowManager.LayoutParams lp = w.getAttributes();
            lp.getClass().getField("layoutInDisplayCutoutMode").setInt(lp, 1);
            w.setAttributes(lp);
        } catch (Throwable ignored) {}

        web = new WebView(this);
        web.setBackgroundColor(0xff0a0c0f);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        call(s, "setMediaPlaybackRequiresUserGesture", false);
        call(s, "setAllowFileAccessFromFileURLs", true);
        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, String url) {
                if (url.startsWith("file:")) return false;
                openUrl(url);
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (pending != null) pending.onReceiveValue(null);
                pending = cb;
                return choose(p != null && p.isCaptureEnabled());
            }
        });
        setContentView(web);
        hideBars();
        if (saved != null) web.restoreState(saved);
        else web.loadUrl(startUrl());
    }

    private SharedPreferences prefs() { return getSharedPreferences("wol", MODE_PRIVATE); }

    // the bundled game, unless an in-app update downloaded a newer one
    private String startUrl() {
        int bundled = 0;
        try {
            InputStream in = getAssets().open("version.txt");
            byte[] b = new byte[32]; int n = in.read(b); in.close();
            bundled = Integer.parseInt(new String(b, 0, Math.max(0, n)).trim());
        } catch (Throwable ignored) {}
        File f = new File(new File(getFilesDir(), "www"), "index.html");
        int got = prefs().getInt("gameVersion", 0);
        return got > bundled && f.length() > 0 ? Uri.fromFile(f).toString() : "file:///android_asset/index.html";
    }

    private static void download(String url, File to) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(15000); c.setReadTimeout(60000); c.setInstanceFollowRedirects(true);
        if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode());
        File tmp = new File(to.getPath() + ".part");
        to.getParentFile().mkdirs();
        InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(tmp);
        byte[] b = new byte[65536]; int n;
        while ((n = in.read(b)) > 0) out.write(b, 0, n);
        out.close(); in.close();
        if (tmp.length() < 1000) throw new Exception("file too small");
        if (!tmp.renameTo(to)) throw new Exception("could not save");
    }

    private void failed(final String msg) {
        runOnUiThread(new Runnable() { public void run() {
            web.loadUrl("javascript:window.wolUpdateFailed && wolUpdateFailed(" + "\"" + msg.replaceAll("[^A-Za-z0-9 .:,_-]", " ") + "\"" + ")");
        } });
    }

    private static void call(WebSettings s, String name, boolean v) {
        try { s.getClass().getMethod(name, boolean.class).invoke(s, v); } catch (Throwable ignored) {}
    }

    private void hideBars() { web.setSystemUiVisibility(IMMERSIVE); }

    @Override
    public void onWindowFocusChanged(boolean has) {
        super.onWindowFocusChanged(has);
        if (has) hideBars();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onPause() { super.onPause(); web.onPause(); }

    @Override
    protected void onResume() { super.onResume(); web.onResume(); hideBars(); }

    // back never kills a run halfway; it just sends the app to the background
    @Override
    public void onBackPressed() { moveTaskToBack(true); }

    private boolean choose(boolean camera) {
        Intent cam = null;
        try {
            File dir = new File(getCacheDir(), "cam");
            dir.mkdirs();
            File f = new File(dir, "shot-" + System.currentTimeMillis() + ".jpg");
            camUri = Uri.parse("content://" + CamProvider.AUTH + "/" + f.getName());
            cam = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            cam.putExtra(MediaStore.EXTRA_OUTPUT, camUri);
            cam.setClipData(ClipData.newRawUri("", camUri));
            cam.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (Throwable t) { camUri = null; }
        Intent lib = new Intent(Intent.ACTION_GET_CONTENT);
        lib.addCategory(Intent.CATEGORY_OPENABLE);
        lib.setType("image/*");
        Intent go;
        if (camera && cam != null) go = cam;
        else {
            go = Intent.createChooser(lib, "Pick a photo");
            if (cam != null) go.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{cam});
        }
        try { startActivityForResult(go, PICK); return true; }
        catch (ActivityNotFoundException e) {
            if (go != lib) try { startActivityForResult(lib, PICK); return true; } catch (ActivityNotFoundException ignored) {}
            pending.onReceiveValue(null); pending = null; return false;
        }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req != PICK || pending == null) { super.onActivityResult(req, res, data); return; }
        Uri[] out = null;
        if (res == RESULT_OK) {
            if (data != null && data.getData() != null) out = new Uri[]{data.getData()};
            else if (camUri != null && CamProvider.file(this, camUri).length() > 0) out = new Uri[]{camUri};
        }
        pending.onReceiveValue(out);
        pending = null;
    }

    private void openUrl(String url) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Throwable ignored) {}
    }

    private final java.util.HashMap<String, String> results = new java.util.HashMap<String, String>();

    private class Bridge {
        @JavascriptInterface
        public void openUrl(final String url) {
            runOnUiThread(new Runnable() { public void run() { MainActivity.this.openUrl(url); } });
        }

        // opens the Revolut app itself (for sending a pay-out), falling back to the website
        @JavascriptInterface
        public void openRevolut(final String fallback) {
            runOnUiThread(new Runnable() {
                public void run() {
                    Intent i = getPackageManager().getLaunchIntentForPackage("com.revolut.revolut");
                    if (i != null) try { startActivity(i); return; } catch (Throwable ignored) {}
                    MainActivity.this.openUrl(fallback);
                }
            });
        }

        @JavascriptInterface
        public boolean isApp() { return true; }

        // HTTP for the wallet database, done natively so the page never hits CORS rules from file://
        @JavascriptInterface
        public void http(final String id, final String method, final String url, final String ifMatch, final boolean wantTag, final String body) {
            new Thread(new Runnable() { public void run() {
                String res;
                try {
                    HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                    c.setConnectTimeout(15000); c.setReadTimeout(20000); c.setUseCaches(false);
                    if ("PATCH".equals(method)) { c.setRequestMethod("POST"); c.setRequestProperty("X-HTTP-Method-Override", "PATCH"); }
                    else c.setRequestMethod(method);
                    if (wantTag) c.setRequestProperty("X-Firebase-ETag", "true");
                    if (ifMatch != null && ifMatch.length() > 0) c.setRequestProperty("if-match", ifMatch);
                    if (body != null && !"GET".equals(method)) {
                        c.setDoOutput(true);
                        OutputStream o = c.getOutputStream(); o.write(body.getBytes("UTF-8")); o.close();
                    }
                    int code = c.getResponseCode();
                    InputStream in = code < 400 ? c.getInputStream() : c.getErrorStream();
                    java.io.ByteArrayOutputStream bo = new java.io.ByteArrayOutputStream();
                    if (in != null) { byte[] b = new byte[16384]; int n; while ((n = in.read(b)) > 0) bo.write(b, 0, n); in.close(); }
                    String tag = c.getHeaderField("ETag");
                    res = code + "\n" + (tag == null ? "" : tag) + "\n" + bo.toString("UTF-8");
                } catch (Throwable t) { res = "0\n\n"; }
                synchronized (results) { results.put(id, res); }
                runOnUiThread(new Runnable() { public void run() { web.loadUrl("javascript:window.__httpDone && __httpDone('" + id.replaceAll("[^A-Za-z0-9]", "") + "')"); } });
            } }).start();
        }

        @JavascriptInterface
        public String httpTake(String id) { synchronized (results) { return results.remove(id); } }

        @JavascriptInterface
        public int apkVersion() {
            try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionCode; } catch (Throwable t) { return 0; }
        }

        // kept outside the WebView so login and stake survive game updates
        @JavascriptInterface
        public String getPref(String k) { return prefs().getString(k, null); }

        @JavascriptInterface
        public void setPref(String k, String v) {
            if (v == null || v.length() == 0) prefs().edit().remove(k).apply(); else prefs().edit().putString(k, v).apply();
        }

        @JavascriptInterface
        public void updateGame(final String url, final String version) {
            new Thread(new Runnable() { public void run() {
                try {
                    final File f = new File(new File(getFilesDir(), "www"), "index.html");
                    download(url, f);
                    prefs().edit().putInt("gameVersion", Integer.parseInt(version.trim())).apply();
                    runOnUiThread(new Runnable() { public void run() { web.loadUrl(Uri.fromFile(f).toString()); } });
                } catch (Throwable t) { failed(String.valueOf(t.getMessage())); }
            } }).start();
        }

        @JavascriptInterface
        public void installApk(final String url) {
            new Thread(new Runnable() { public void run() {
                try {
                    File f = new File(new File(getCacheDir(), "cam"), "update.apk");
                    download(url, f);
                    final Uri u = Uri.parse("content://" + CamProvider.AUTH + "/update.apk");
                    runOnUiThread(new Runnable() { public void run() {
                        Intent i = new Intent(Intent.ACTION_VIEW);
                        i.setDataAndType(u, "application/vnd.android.package-archive");
                        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                        try { startActivity(i); } catch (Throwable t) { failed("no installer"); }
                    } });
                } catch (Throwable t) { failed(String.valueOf(t.getMessage())); }
            } }).start();
        }
    }
}
