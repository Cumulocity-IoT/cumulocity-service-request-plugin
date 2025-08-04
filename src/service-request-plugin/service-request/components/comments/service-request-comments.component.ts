import { Component, Input, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FilePickerComponent, PickedFiles } from '@c8y/ngx-components';
import saveAs from 'file-saver';
import {
  ServiceRequestComment,
  ServiceRequestCommentForm,
  SERVICE_REQUEST_COMMENTS_DEFAULT_PAGE_SIZE,
} from '../../models/service-request-comments.model';
import { ServiceRequestCommentsService } from '../../service/service-request-comments.service';

@Component({
  selector: 'service-request-comments',
  templateUrl: './service-request-comments.component.html',
  styleUrls: ['./service-request-comments.component.less'],
  standalone: false,
  providers: [ServiceRequestCommentsService],
})
export class ServiceRequestCommentsComponent {
  private _id: string;

  loadingComments = false;
  formInAction = false;
  comments: ServiceRequestComment[] = [];
  additionalCommentsCount = 0;
  attachment: File = null;

  form = new FormGroup({
    text: new FormControl('', [Validators.required]),
  });

  @Input('displayedItems') displayedItems: number;

  @Input('isCreateForm') isCreateForm: boolean;

  @Input('id')
  set id(id: string) {
    this._id = id;
  }

  get id() {
    return this._id;
  }

  @ViewChild('picker') picker: FilePickerComponent;

  constructor(
    private serviceRequestCommentsService: ServiceRequestCommentsService
  ) {}

  private async fetchComments(id: string) {
    this.loadingComments = true;

    try {
      const comments = await this.serviceRequestCommentsService.list(id);

      const displayedCommentsLimit =
        this.displayedItems ?? SERVICE_REQUEST_COMMENTS_DEFAULT_PAGE_SIZE;

      this.comments = comments.slice(0, displayedCommentsLimit);

      // limit count to 0 if there are less comments than displayedCommentsLimit (would result in negative number)
      this.additionalCommentsCount = Math.max(
        0,
        comments.length - displayedCommentsLimit
      );
    } finally {
      this.loadingComments = false;
    }
  }

  async ngOnInit() {
    await this.fetchComments(this.id);
  }

  async submitComment(): Promise<void> {
    const formValue = this.form.value as ServiceRequestCommentForm;

    if (!formValue?.text || this.formInAction) {
      return;
    }

    this.formInAction = true;

    const comment = await this.serviceRequestCommentsService.create(this.id, {
      text: formValue?.text,
      type: 'user',
    });

    if (comment) {
      this.formInAction = false;

      this.form.reset({
        text: '',
      });

      // use the created comment id to upload the attachment in a second request
      if (this.attachment) {
        if (
          await this.serviceRequestCommentsService.uploadAttachment(
            comment.id,
            this.attachment
          )
        ) {
          this.attachment = null;
          this.picker?.clearSelectedFiles();
        }
      }

      await this.fetchComments(this.id);
    }
  }

  tiggerUpload(filePicker: FilePickerComponent) {
    filePicker?.dropArea?.showPicker();
  }

  async downloadAttachment(comment: ServiceRequestComment) {
    if (!comment.attachment) {
      return;
    }

    const file = await this.serviceRequestCommentsService.downloadAttachment(
      comment.id
    );

    if (!file) {
      return;
    }

    const blob = new Blob([file]);

    saveAs(blob, comment.attachment.name);
  }

  onFiles(files: PickedFiles) {
    const droppedFile = files?.droppedFiles?.shift();

    // TODO: if in the future service requests support multiple attachments, use all dropped files instead of only the first
    if (droppedFile) {
      this.attachment = droppedFile.file;
    }
  }
}
