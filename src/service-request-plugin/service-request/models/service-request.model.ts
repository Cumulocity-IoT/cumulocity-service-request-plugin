export const SERVICE_REQUEST_DEFAULT_PAGE_SIZE = 500;
export const SERVICE_REQUEST_PATH = 'service-requests';
// Canonical base URL for the service-request-mgmt microservice's public API.
// Re-exported by models/service-request-comments.model.ts for backwards-compatible imports.
export const SERVICE_REQUEST_API_URL = '/service/service-request-mgmt/api/service';
export interface Reference {
  uri: string;
  id?: string;
}
// Matches the microservice's ServiceRequestDataRef schema, used by the dedicated
// PUT /request/{id}/alarm and PUT /request/{id}/event single-reference endpoints.
export interface ServiceRequestDataRef {
  id: string;
  uri?: string;
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
export type ServiceRequestType = 'alarm' | 'note' | 'maintenance' | 'downtime' | 'other';
export interface ServiceOrder {
  id: string;
  priority?: string;
  status?: string;
}
export interface ServiceRequestObject {
  id: string;
  lastUpdated: string | Date;
  isActive: boolean;
  isClosed?: boolean;
  creationTime: string;
  updateTime: string;
  owner: string;
  type: ServiceRequestType;
  title: string;
  status: ServiceRequestStatus;
  description?: string;
  priority?: ServiceRequestPriority;
  source?: Source;
  /** @deprecated use alarmRefList instead */
  alarmRef?: Reference;
  alarmRefList?: ServiceRequestDataRef[];
  /** @deprecated use eventRefList instead */
  eventRef?: Reference;
  eventRefList?: ServiceRequestDataRef[];
  seriesRef?: Reference;
  externalId?: string;
  order?: ServiceOrder;
  fieldAssignee?: string;
  fieldScheduleStart?: string;
  fieldScheduleEnd?: string;
  fieldScheduleDue?: string;
  fieldProgressPercentage?: number;
  fsmLink?: string;
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
  /** Optional — omit to let the microservice apply its configured initial status (FR-078: status is never set by the UI). */
  status?: ServiceRequestObject['status'];
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
  statusList?: string[];
  priorityList?: number[];
  orderBy?: string[];
  all?: boolean;
  type?: ServiceRequestType;
  pageSize?: number;
  currentPage?: number;
  withTotalPages?: boolean;
}
export interface ServiceRequestListResponse {
  list: ServiceRequestObject[];
  currentPage?: number;
  pageSize?: number;
  totalPages?: number;
  totalElements?: number;
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
