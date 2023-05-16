# Service request plugin

This plugin extends Cumulocity application like Cockpit with the capability to create, update and manage service requests.

The UI Plugin is depending on the domain specific API provided by a Microservice:
[Open API documentation](https://github.com/SoftwareAG/cumulocity-microservice-service-request-mgmt/blob/develop/docs/README.md)

This microservice can be extendet or even replaced if needed. Custome microservice have to implement the REST API documentated above.

# Requirements

This plugin requires a Microservice called Service-request-mgmt to be installed on the tenant.
Reposiotory: [Standard cumulocity-microservice-service-request-mgmt](https://github.com/SoftwareAG/cumulocity-microservice-service-request-mgmt)

## Sample images

Overview dashboard
![alt See alarms and service requests](/docs/notifications-dashboard.png)

You can create service requests from scratch, or based on an alarm.
![alt Create or edit service requests](/docs/edit-service-request.png)

Users can comment on service requests
![alt Layers](/docs/comments.png)
## Recommended versions
node v 14.x
npm v 6.x

## Plugin versions
Angular v 14.x
WebSDK v 1016.0.x

**How to start**
Change the target tenant and application you want to run this plugin on in the `package.json`.

```
c8ycli server -u https://{{your-tenant}}.cumulocity.com/ --shell {{cockpit}}
```
Keep in mind that this plugin needs to have an app (e.g. cockpit) running with at least the same version as this plugin. if your tenant contains an older version, use the c8ycli to create a cockpit clone running with at least v 1016.0.59! Upload this clone to the target tenant (e.g. cockpit-1016) and reference this name in the --shell command.

The widget plugin can be locally tested via the start script:

```
npm start
```

In the Module Federation terminology, `widget` plugin is called `remote` and the `cokpit` is called `shell`. Modules provided by this `widget` will be loaded by the `cockpit` application at the runtime. This plugin provides a basic custom widget that can be accessed through the `Add widget` menu.

> Note that the `--shell` flag creates a proxy to the cockpit application and provides` AdvancedMapWidgetModule` as an `remote` via URL options.

Also deploying needs no special handling and can be simply done via `npm run deploy`. As soon as the application has exports it will be uploaded as a plugin.

------------------------------
These tools are provided as-is and without warranty or support. They do not constitute part of the Software AG product suite. Users are free to use, fork and modify them, subject to the license agreement. While Software AG welcomes contributions, we cannot guarantee to include every contribution in the master project.
_____________________
For more information you can Ask a Question in the [TECHcommunity Forums](http://tech.forums.softwareag.com/techjforum/forums/list.page?product=cumulocity).
You can find additional information in the [Software AG TECHcommunity](http://techcommunity.softwareag.com/home/-/product/name/cumulocity).
