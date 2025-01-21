import { ServiceRequestAttachment } from './service-request.model';

export const SERVICE_REQUEST_COMMENTS_DEFAULT_PAGE_SIZE = 500;
export const SERVICE_REQUEST_API_URL = '/service/service-request-mgmt/api/service';
export interface ServiceRequestCommentForm {
  text: string;
}
export interface ServiceRequestComment {
  id: string;
  owner: string;
  creationTime: string;
  text: string;
  type: 'user' | 'system';
  attachment?: ServiceRequestAttachment;
}
export interface ServiceRequestCommentListResponse {
  list: ServiceRequestComment[];
}
export interface ServiceRequestCommentsErrorResponse {
  error: string;
  path: string;
  status: number;
  timestamp: string;
}
