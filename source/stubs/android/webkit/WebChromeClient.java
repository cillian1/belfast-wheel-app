package android.webkit;
// compile-only stub (API 21 file chooser); the real class is on the phone
public class WebChromeClient {
    public boolean onShowFileChooser(WebView v, ValueCallback<android.net.Uri[]> cb, FileChooserParams p) { return false; }
    public static abstract class FileChooserParams {
        public abstract boolean isCaptureEnabled();
    }
}
