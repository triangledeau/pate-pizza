package fr.triangledeau.patepizza;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SerieBtPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
