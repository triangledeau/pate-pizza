package fr.triangledeau.patepizza;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /** Page à ouvrir, passée par les raccourcis de l'icône (res/xml/shortcuts.xml). */
    static final String EXTRA_PAGE = "page";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SerieBtPlugin.class);
        super.onCreate(savedInstanceState);

        // Retour arrière : la page ferme d'abord ce qui est ouvert (window.surRetour), puis on remonte
        // l'historique du WebView ; au tout début, l'appli passe en arrière-plan sans se fermer.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                retour();
            }
        });
    }

    // BridgeActivity l'appelle aussi au démarrage avec l'intent de lancement.
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent != null) setIntent(intent);
        ouvrirRaccourci(intent);
    }

    private void ouvrirRaccourci(Intent intent) {
        if (intent == null || getBridge() == null) return;
        String page = intent.getStringExtra(EXTRA_PAGE);
        if (page == null || page.isEmpty() || page.contains("://")) return;
        intent.removeExtra(EXTRA_PAGE);
        String base = getBridge().getLocalUrl();
        if (base.endsWith("/")) base = base.substring(0, base.length() - 1);
        String url = base + "/" + page;
        WebView wv = getBridge().getWebView();
        wv.post(() -> wv.loadUrl(url));
    }

    private void retour() {
        WebView wv = getBridge() == null ? null : getBridge().getWebView();
        if (wv == null) {
            moveTaskToBack(true);
            return;
        }
        wv.evaluateJavascript(
            "(function(){try{return !!(window.surRetour&&window.surRetour())}catch(e){return false}})()",
            traite -> {
                if ("true".equals(traite)) return;
                if (wv.canGoBack()) wv.goBack();
                else moveTaskToBack(true);
            });
    }
}
