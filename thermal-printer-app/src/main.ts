import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { importProvidersFrom } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

// Initialize Capacitor plugins
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar } from '@capacitor/status-bar';
import { App } from '@capacitor/app';

// Initialize app
const appInit = async () => {
  // Add device ready listener for Cordova plugins
  document.addEventListener('deviceready', () => {
    console.log('Cordova plugins initialized');
  }, false);

  try {
    await SplashScreen.hide();
    await StatusBar.setBackgroundColor({ color: '#3880ff' });
  } catch (err) {
    console.error('Error initializing plugins', err);
  }
};

// Add device back button handling
document.addEventListener('ionBackButton', (ev: any) => {
  ev.detail.register(10, () => {
    App.exitApp();
  });
});

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({
      mode: 'md',
      animated: true,
    }),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    importProvidersFrom(
      HttpClientModule
    ),
  ],
}).then(() => appInit())
  .catch(err => console.error(err));
