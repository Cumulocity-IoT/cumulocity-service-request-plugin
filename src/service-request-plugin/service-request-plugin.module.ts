import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  CoreModule,
  CommonModule,
} from "@c8y/ngx-components";

import { ServiceRequestModule } from "./service-request/service-request.module";

@NgModule({
  imports: [
    CoreModule,
    CommonModule,
    FormsModule,
    ServiceRequestModule
  ],
  
})
export class ServiceRequestPluginModule {}
