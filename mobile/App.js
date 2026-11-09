// تطبيق «لعبك» — المرحلة الأولى: غلاف أصلي يفتح الموقع داخل التطبيق.
// بدون أي تعديل على كود الموقع. المميزات الخاصة بالجوال تنضاف في مراحل لاحقة.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

SplashScreen.preventAutoHideAsync().catch(() => {});

const extra = Constants.expoConfig?.extra ?? {};
const SITE_URL = extra.siteUrl ?? 'https://la3bak.com';
const ALLOWED_HOSTS = new Set(extra.allowedHosts ?? ['la3bak.com', 'www.la3bak.com']);
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const C = { bg: '#0D0614', panel: '#1C0A30', gold: '#FFD66B', text: '#F5E9FF', muted: '#CDB8E6', violet: '#A63DFF' };

// يشتغل قبل تحميل الصفحة: يعرّف الموقع إنه داخل التطبيق، ويخليه يتصرف كأنه مثبّت
// (عشان ما يطلع زر «ثبّت كتطبيق» داخل التطبيق نفسه).
const BEFORE_LOAD = `
(function () {
  try {
    window.LA3BAK_APP = { platform: '${Platform.OS}', version: '${APP_VERSION}' };
    try { Object.defineProperty(navigator, 'standalone', { get: function () { return true; }, configurable: true }); } catch (e) {}
    var mm = window.matchMedia && window.matchMedia.bind(window);
    if (mm) window.matchMedia = function (q) {
      if (/display-mode:\\s*standalone/.test(String(q))) return { matches: true, media: q, addListener: function(){}, removeListener: function(){}, addEventListener: function(){}, removeEventListener: function(){}, onchange: null, dispatchEvent: function(){ return false; } };
      return mm(q);
    };
    document.documentElement.classList.add('in-app', 'in-app-' + '${Platform.OS}');
  } catch (e) {}
})();
true;
`;

function hostOf(url) {
  const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#:]+)/i.exec(url || '');
  return m ? m[1].toLowerCase() : '';
}

export default function App() {
  const web = useRef(null);
  const canGoBack = useRef(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [offline, setOffline] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // زر الرجوع في الأندرويد: يرجع داخل الموقع بدل ما يسكّر التطبيق
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack.current && web.current) { web.current.goBack(); return true; }
      return false;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => NetInfo.addEventListener((s) => setOffline(s.isConnected === false)), []);

  const onLoadEnd = useCallback(() => {
    setReady(true);
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // روابط الموقع تفتح داخل التطبيق؛ أي رابط ثاني (واتساب، إنستقرام، دفع خارجي…) يفتح برا التطبيق
  const onShouldStart = useCallback((req) => {
    const url = req.url || '';
    if (/^(about:|data:|blob:|javascript:)/i.test(url)) return true;
    const host = hostOf(url);
    if (ALLOWED_HOSTS.has(host)) return true;
    if (req.isTopFrame === false) return true; // إطارات داخلية (مثل يوتيوب) تبقى داخل الصفحة
    Linking.openURL(url).catch(() => {});
    return false;
  }, []);

  const retry = useCallback(() => {
    setFailed(false);
    setReady(false);
    setReloadKey((k) => k + 1);
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="light" backgroundColor={C.bg} />
        {failed ? (
          <View style={styles.center}>
            <Text style={styles.title}>ما قدرنا نفتح لعبك</Text>
            <Text style={styles.sub}>{offline ? 'جوالك مو متصل بالإنترنت.' : 'صار خطأ في الاتصال بالموقع.'}</Text>
            <Pressable onPress={retry} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]} accessibilityRole="button">
              <Text style={styles.btnText}>جرّب مرة ثانية</Text>
            </Pressable>
          </View>
        ) : (
          <WebView
            key={reloadKey}
            ref={web}
            source={{ uri: SITE_URL }}
            style={styles.web}
            containerStyle={{ backgroundColor: C.bg }}
            originWhitelist={['https://*', 'http://*', 'about:*', 'data:*', 'blob:*']}
            injectedJavaScriptBeforeContentLoaded={BEFORE_LOAD}
            applicationNameForUserAgent={`La3bakApp/${APP_VERSION}`}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            cacheEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
            allowsBackForwardNavigationGestures
            setSupportMultipleWindows={false}
            pullToRefreshEnabled={false}
            bounces={false}
            overScrollMode="never"
            textZoom={100}
            onShouldStartLoadWithRequest={onShouldStart}
            onNavigationStateChange={(s) => { canGoBack.current = s.canGoBack; }}
            onLoadEnd={onLoadEnd}
            onError={() => { setFailed(true); SplashScreen.hideAsync().catch(() => {}); }}
            onContentProcessDidTerminate={() => web.current?.reload()}
            onRenderProcessGone={() => web.current?.reload()}
          />
        )}
        {!ready && !failed ? (
          <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
            <ActivityIndicator size="large" color={C.gold} />
          </View>
        ) : null}
        {offline && !failed ? (
          <View style={styles.banner} pointerEvents="none">
            <Text style={styles.bannerText}>ما فيه إنترنت — بنرجع نتصل أول ما يرجع</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  web: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: C.bg },
  title: { color: C.gold, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  sub: { color: C.muted, fontSize: 15, textAlign: 'center', marginBottom: 24 },
  btn: { backgroundColor: C.gold, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16, minWidth: 180, alignItems: 'center' },
  btnText: { color: '#2A1600', fontSize: 17, fontWeight: '800' },
  banner: { position: 'absolute', top: 8, left: 16, right: 16, backgroundColor: C.panel, borderColor: C.gold, borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  bannerText: { color: C.text, fontSize: 13, textAlign: 'center' },
});
