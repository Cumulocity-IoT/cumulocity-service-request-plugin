import { Component, Input, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FilePickerComponent, PickedFiles } from '@c8y/ngx-components';
import { ServiceRequestAttachment } from '../../models/service-request.model';
import saveAs from 'file-saver';
import { ServiceRequestAttachmentsService } from '../../service/service-request-attachments.service';

@Component({
  selector: 'service-request-attachments',
  templateUrl: './service-request-attachments.component.html',
  styleUrls: ['./service-request-attachments.component.less'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: ServiceRequestAttachmentsComponent,
    },
  ],
})
export class ServiceRequestAttachmentsComponent implements ControlValueAccessor {
  private _id: string;
  private multiFileAllowed = false;

  attachments: ServiceRequestAttachment[] = [];

  onChange: (attachment: ServiceRequestAttachment | ServiceRequestAttachment[]) => void = null;
  onTouched: () => void = null;

  @ViewChild('picker') picker: FilePickerComponent;

  @Input('id') set id(id: string) {
    this._id = id;
  }

  get id() {
    return this._id;
  }

  constructor(private serviceRequestAttachmentsService: ServiceRequestAttachmentsService) {}

  writeValue(value: ServiceRequestAttachment | ServiceRequestAttachment[]): void {
    if (!value) {
      this.attachments = [];

      return;
    }

    // add custom flags to attachment objects
    if (Array.isArray(value)) {
      this.attachments = value.map((attachment) => ({
        ...attachment,
        delete: false,
        new: false,
      }));
    } else {
      this.attachments = [
        {
          ...value,
          delete: false,
          new: false,
        },
      ];
    }
  }

  registerOnChange(onChange: (attachment: ServiceRequestAttachment | ServiceRequestAttachment[]) => void) {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void) {
    this.onTouched = onTouched;
  }

  onFiles(files: PickedFiles) {
    const droppedFile = files?.droppedFiles?.shift();

    // TODO: if in the future service requests support multiple attachments, use all dropped files instead of only the first
    if (droppedFile) {
      const attachment: ServiceRequestAttachment = {
        file: droppedFile.file,
        name: droppedFile.file.name,
        length: droppedFile.file.size,
        type: droppedFile.file.type,
        new: true,
      };

      // TODO: if in the future service requests support multiple attachments, always add attachments instead of replacing / flag as delete
      if (this.multiFileAllowed) {
        this.attachments.push(attachment);
      } else {
        const existingAttachment = this.attachments.shift();

        if (existingAttachment) {
          existingAttachment.delete = true;

          this.attachments = [existingAttachment, attachment];
        } else {
          this.attachments = [attachment];
        }
      }

      this.picker?.clearSelectedFiles();

      this.onChange(this.attachments);
    }
  }

  async download(attachment: ServiceRequestAttachment) {
    const file = await this.serviceRequestAttachmentsService.downloadAttachment(this.id);

    if (!file) {
      return;
    }

    const blob = new Blob([file]);

    saveAs(blob, attachment.name);
  }

  // TODO: delete existing attachment using microservice (waiting on API endpoint)
  delete(attachment: ServiceRequestAttachment) {
    if (attachment.new) {
      const index = this.attachments.findIndex((a) => a === attachment);

      this.attachments.splice(index, 1);

      // TODO: if in the future service requests support multiple attachments, this is no longer needed
      if (!this.multiFileAllowed) {
        // reset delete flag
        this.attachments.forEach((a) => (a.delete = false));
      }
    }
  }
}
