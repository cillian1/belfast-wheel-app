// Signs (v2; Android 7+ needs nothing else) and verifies an APK with Google's apksig library (Maven Central, no Android SDK needed).
// usage: java -cp apksig.jar tools/Sign.java in.apk out.apk keystore.p12 storepass alias
import com.android.apksig.ApkSigner;
import com.android.apksig.ApkVerifier;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.Collections;

public class Sign {
    public static void main(String[] a) throws Exception {
        KeyStore ks = KeyStore.getInstance("PKCS12");
        try (InputStream in = new FileInputStream(a[2])) { ks.load(in, a[3].toCharArray()); }
        PrivateKey key = (PrivateKey) ks.getKey(a[4], a[3].toCharArray());
        X509Certificate cert = (X509Certificate) ks.getCertificate(a[4]);
        ApkSigner.SignerConfig sc = new ApkSigner.SignerConfig.Builder("wheel", key, Collections.singletonList(cert)).build();
        new ApkSigner.Builder(Collections.singletonList(sc))
            .setInputApk(new File(a[0])).setOutputApk(new File(a[1]))
            .setMinSdkVersion(24).setV1SigningEnabled(false).setV2SigningEnabled(true)
            .build().sign();
        ApkVerifier.Result r = new ApkVerifier.Builder(new File(a[1])).setMinCheckedPlatformVersion(24).setMaxCheckedPlatformVersion(35).build().verify();
        System.out.println("verified=" + r.isVerified() + " v1=" + r.isVerifiedUsingV1Scheme() + " v2=" + r.isVerifiedUsingV2Scheme());
        for (ApkVerifier.IssueWithParams e : r.getErrors()) System.out.println("ERROR " + e);
        if (!r.isVerified()) System.exit(1);
    }
}
