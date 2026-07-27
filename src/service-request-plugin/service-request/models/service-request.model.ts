export const SERVICE_REQUEST_DEFAULT_PAGE_SIZE = 500;
export const SERVICE_REQUEST_PATH = 'service-requests';

/**
 * Fragment which marks a managed object as an asset. Only managed objects carrying
 * this fragment get the service request dashboard in the group/asset context.
 */
export const SERVICE_REQUEST_ASSET_FRAGMENT = 'c8y_IsAsset';

/**
 * Tenant option which optionally restricts the service request dashboard to a set of
 * asset types. If the option is missing or empty, the dashboard is shown for every asset.
 *
 * The value is a list of asset types, either as JSON array (`["c8y_Building", "c8y_Room"]`)
 * or as a comma separated string (`c8y_Building,c8y_Room`).
 */
export const SERVICE_REQUEST_ASSET_TYPES_OPTION_CATEGORY = 'service-request';
export const SERVICE_REQUEST_ASSET_TYPES_OPTION_KEY = 'asset.types';
export interface Reference {
  uri: string;
  id?: string;
}
export interface Source {
  id: string;
  self: string;
  name: string;
}
export interface ServiceRequestForm {
  text: string;
}
export interface ServiceRequestStatus {
  id: string;
  name: string;
}
export interface ServiceRequestPriority {
  name: string;
  ordinal: number;
}

export interface ServiceRequestAttachment {
  name: string;
  length: number;
  type: string;
  file?: File;
  new?: boolean;
  delete?: boolean;
}
export interface ServiceRequestObject {
  id: string;
  lastUpdated: string | Date;
  isActive: boolean;
  creationTime: string;
  updateTime: string;
  owner: string;
  type: 'alarm';
  title: string;
  status: ServiceRequestStatus;
  description?: string;
  priority?: ServiceRequestPriority;
  source?: Source;
  alarmRef?: Reference;
  eventRef?: Reference;
  seriesRef?: Reference;
  customProperties?: object;
  attachment: ServiceRequestAttachment;
}
export interface ServiceRequestComment {
  id: string;
  owner: string;
  creationTime: string;
  text: string;
  type: 'user' | 'system';
}
export interface CreateServiceRequestRequest {
  type: ServiceRequestObject['type'];
  title: ServiceRequestObject['title'];
  description?: ServiceRequestObject['description'];
  status: ServiceRequestObject['status'];
  priority?: ServiceRequestObject['priority'];
  source?: ServiceRequestObject['source'];
  alarmRef?: ServiceRequestObject['alarmRef'];
  eventRef?: ServiceRequestObject['eventRef'];
  seriesRef?: ServiceRequestObject['seriesRef'];
  customProperties?: ServiceRequestObject['customProperties'];
}
export interface UpdateServiceRequestRequest {
  status?: ServiceRequestObject['status'];
  priority?: ServiceRequestObject['priority'];
  title?: ServiceRequestObject['title'];
  description?: ServiceRequestObject['description'];
  isActive?: boolean;
  customProperties?: ServiceRequestObject['customProperties'];
}
export interface ServiceRequestListRequest {
  sourceId?: string;
  statusId?: string;
  pageSize?: number;
  withTotalPages?: boolean;
}
export interface ServiceRequestListResponse {
  list: ServiceRequestObject[];
}
export interface ServiceRequestCommentListResponse {
  list: ServiceRequestComment[];
}
export interface ServiceRequestErrorResponse {
  error: string;
  path: string;
  status: number;
  timestamp: string;
}
