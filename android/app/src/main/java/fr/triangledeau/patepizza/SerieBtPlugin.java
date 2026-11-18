package fr.triangledeau.patepizza;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.os.Build;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.lang.reflect.Method;
import java.util.UUID;

/**
 * Liaison série Bluetooth classique (profil SPP) avec le Cook Expert.
 * Remplace Web Serial, absent de la WebView Android. Envoie et reçoit des octets bruts :
 * le protocole (trames, CRC, touches autorisées) reste côté JavaScript.
 */
@CapacitorPlugin(
    name = "SerieBt",
    permissions = { @Permission(alias = "bt", strings = { Manifest.permission.BLUETOOTH_CONNECT }) }
)
public class SerieBtPlugin extends Plugin {

    private static final UUID SPP = UUID.fromString("00001101-0000-1000-8000-00805f9b34fb");

    private BluetoothSocket socket;
    private OutputStream sortie;

    private boolean autorise() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.S || getPermissionState("bt") == PermissionState.GRANTED;
    }

    private BluetoothAdapter adaptateur() {
        BluetoothManager m = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        return m == null ? null : m.getAdapter();
    }

    @PluginMethod
    public void appareils(PluginCall call) {
        if (!autorise()) {
            requestPermissionForAlias("bt", call, "apresPermAppareils");
            return;
        }
        lister(call);
    }

    @PermissionCallback
    private void apresPermAppareils(PluginCall call) {
        if (!autorise()) {
            call.reject("Autorisation « Appareils à proximité » refusée");
            return;
        }
        lister(call);
    }

    @SuppressLint("MissingPermission")
    private void lister(PluginCall call) {
        BluetoothAdapter a = adaptateur();
        if (a == null) {
            call.reject("Ce téléphone n'a pas de Bluetooth");
            return;
        }
        if (!a.isEnabled()) {
            call.reject("Bluetooth désactivé : active-le puis réessaie");
            return;
        }
        JSArray liste = new JSArray();
        for (BluetoothDevice d : a.getBondedDevices()) {
            JSObject o = new JSObject();
            o.put("nom", d.getName());
            o.put("adresse", d.getAddress());
            liste.put(o);
        }
        JSObject r = new JSObject();
        r.put("appareils", liste);
        call.resolve(r);
    }

    @PluginMethod
    public void connecter(PluginCall call) {
        if (!autorise()) {
            requestPermissionForAlias("bt", call, "apresPermConnecter");
            return;
        }
        ouvrir(call);
    }

    @PermissionCallback
    private void apresPermConnecter(PluginCall call) {
        if (!autorise()) {
            call.reject("Autorisation « Appareils à proximité » refusée");
            return;
        }
        ouvrir(call);
    }

    @SuppressLint("MissingPermission")
    private void ouvrir(PluginCall call) {
        String adresse = call.getString("adresse");
        BluetoothAdapter a = adaptateur();
        if (a == null || adresse == null) {
            call.reject("Bluetooth indisponible");
            return;
        }
        if (!a.isEnabled()) {
            call.reject("Bluetooth désactivé : active-le puis réessaie");
            return;
        }
        fermer();
        new Thread(() -> {
            BluetoothDevice d;
            try {
                d = a.getRemoteDevice(adresse);
            } catch (IllegalArgumentException e) {
                call.reject("Adresse du robot invalide");
                return;
            }
            a.cancelDiscovery();
            BluetoothSocket s = null;
            try {
                s = d.createRfcommSocketToServiceRecord(SPP);
                s.connect();
            } catch (IOException e1) {
                try {
                    if (s != null) s.close();
                } catch (IOException ignore) {
                }
                try {
                    // Repli courant pour les modules SPP : canal RFCOMM 1.
                    Method m = d.getClass().getMethod("createRfcommSocket", int.class);
                    s = (BluetoothSocket) m.invoke(d, 1);
                    s.connect();
                } catch (Exception e2) {
                    call.reject("Robot injoignable : allumé, à portée, et l'appli Magimix fermée ?");
                    return;
                }
            }
            try {
                OutputStream o = s.getOutputStream();
                InputStream i = s.getInputStream();
                synchronized (this) {
                    socket = s;
                    sortie = o;
                }
                lire(s, i);
                call.resolve();
            } catch (IOException e) {
                try {
                    s.close();
                } catch (IOException ignore) {
                }
                call.reject("Connexion interrompue : " + e.getMessage());
            }
        }).start();
    }

    private void lire(BluetoothSocket s, InputStream entree) {
        new Thread(() -> {
            byte[] tampon = new byte[512];
            try {
                while (true) {
                    int n = entree.read(tampon);
                    if (n < 0) break;
                    if (n > 0) {
                        JSObject o = new JSObject();
                        o.put("b64", Base64.encodeToString(tampon, 0, n, Base64.NO_WRAP));
                        notifyListeners("donnees", o);
                    }
                }
            } catch (IOException ignore) {
            }
            boolean actif;
            synchronized (this) {
                actif = socket == s;
                if (actif) {
                    socket = null;
                    sortie = null;
                }
            }
            if (actif) {
                JSObject o = new JSObject();
                o.put("raison", "liaison Bluetooth coupée");
                notifyListeners("coupure", o);
            }
        }).start();
    }

    @PluginMethod
    public void ecrire(PluginCall call) {
        String b64 = call.getString("b64");
        OutputStream o;
        synchronized (this) {
            o = sortie;
        }
        if (o == null || b64 == null) {
            call.reject("robot non connecté");
            return;
        }
        try {
            o.write(Base64.decode(b64, Base64.NO_WRAP));
            o.flush();
            call.resolve();
        } catch (IOException e) {
            call.reject("écriture impossible : " + e.getMessage());
        }
    }

    @PluginMethod
    public void deconnecter(PluginCall call) {
        fermer();
        call.resolve();
    }

    private synchronized void fermer() {
        if (socket != null) {
            try {
                socket.close();
            } catch (IOException ignore) {
            }
            socket = null;
            sortie = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        fermer();
    }
}
