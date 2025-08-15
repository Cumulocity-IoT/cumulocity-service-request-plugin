import type { ConfigurationOptions } from '@c8y/devkit';
import { author, description, version, name, license } from './package.json';

export default {
  runTime: {
    name: 'Service Request Plugin',
    key: 'sag-ps-iot-pkg-service-request-key',
    contextPath: 'sag-ps-iot-pkg-service-request-plugin',
    author,
    description,
    version,
    license,
    contentSecurityPolicy:
      "base-uri 'none'; default-src 'self' 'unsafe-inline' http: https: ws: wss:; connect-src 'self' http: https: ws: wss:;  script-src 'self' *.bugherd.com *.twitter.com *.twimg.com *.aptrinsic.com 'unsafe-inline' 'unsafe-eval' data:; style-src * 'unsafe-inline' blob:; img-src * data: blob:; font-src * data:; frame-src *; worker-src 'self' blob:;",
    dynamicOptionsUrl: true,
    package: 'plugin',
    isPackage: true,
    noAppSwitcher: true,
    exports: [
      {
        name: 'Service Request Plugin',
        module: 'ServiceRequestPluginModule',
        path: './src/service-request-plugin/service-request-plugin.module.ts',
        description: '',
      },
    ],
    remotes: {
      'widget-plugin': ['ServiceRequestPluginModule'],
    },
  },
  buildTime: {
    federation: [
      '@angular/animations',
      '@angular/cdk',
      '@angular/common',
      '@angular/compiler',
      '@angular/core',
      '@angular/forms',
      '@angular/platform-browser',
      '@angular/platform-browser-dynamic',
      '@angular/router',
      '@angular/upgrade',
      '@c8y/client',
      '@c8y/ngx-components',
      'ngx-bootstrap',
      '@ngx-translate/core',
      '@ngx-formly/core',
    ],
    copy: [
      {
        from: 'LICENSE',
        to: 'LICENSE.txt',
      },
      {
        from: 'assets',
        to: 'assets',
      },
    ],
  },
} as const satisfies ConfigurationOptions;
