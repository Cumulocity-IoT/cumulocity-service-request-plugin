export const SERVICE_REQUEST_DEFAULT_PAGE_SIZE = 500;
export const SERVICE_REQUEST_PATH = 'service-requests';
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
