import { ServiceRequestAttachment, SERVICE_REQUEST_API_URL } from './service-request.model';

export const SERVICE_REQUEST_COMMENTS_DEFAULT_PAGE_SIZE = 500;
// Re-exported for backwards compatibility; canonical definition lives in service-request.model.ts.
export { SERVICE_REQUEST_API_URL };
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
