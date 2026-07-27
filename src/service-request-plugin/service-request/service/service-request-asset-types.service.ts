import { Injectable } from '@angular/core';
import { OptionsService } from '@c8y/ngx-components';
import {
  SERVICE_REQUEST_ASSET_TYPES_OPTION_CATEGORY,
  SERVICE_REQUEST_ASSET_TYPES_OPTION_KEY,
} from '../models/service-request.model';

/**
 * Reads the tenant option which restricts the service request dashboard to a set of
 * asset types.
 *
 * If the tenant option does not exist (or is empty), the dashboard is displayed for all
 * assets independent of their type.
 */
@Injectable({ providedIn: 'root' })
export class ServiceRequestAssetTypesService {
  // cache the response to not trigger a request again and again
  protected assetTypes: Promise<string[]> | null = null;

  constructor(private optionsService: OptionsService) {}

  /**
   * @returns the configured asset types, an empty list if no restriction is configured.
   */
  fetchAssetTypes(ignoreCache = false): Promise<string[]> {
    if (ignoreCache || !this.assetTypes) {
      this.assetTypes = this.loadAssetTypes();
    }

    return this.assetTypes;
  }

  /**
   * @returns true, if the dashboard should be shown for the given asset type.
   */
  async isAssetTypeEnabled(type?: string): Promise<boolean> {
    const assetTypes = await this.fetchAssetTypes();

    if (!assetTypes.length) {
      return true;
    }

    return !!type && assetTypes.includes(type);
  }

  private async loadAssetTypes(): Promise<string[]> {
    // `getTenantOption` parses JSON values and falls back to the default value in case the
    // option does not exist or is not readable for the current user.
    const value = await this.optionsService.getTenantOption<string[] | string>(
      SERVICE_REQUEST_ASSET_TYPES_OPTION_CATEGORY,
      SERVICE_REQUEST_ASSET_TYPES_OPTION_KEY
    );

    return this.toAssetTypeList(value);
  }

  private toAssetTypeList(value: string[] | string | undefined): string[] {
    // a plain, non JSON value is handed over as string, e.g. `c8y_Building,c8y_Room`
    const list = typeof value === 'string' ? value.split(',') : value;

    if (!Array.isArray(list)) {
      return [];
    }

    return list
      .filter((type) => typeof type === 'string')
      .map((type) => type.trim())
      .filter((type) => !!type);
  }
}
