import { Component, OnInit, TrackByFunction } from '@angular/core';
import { Image, Board, Tag } from '../../shared/models/IPhotoBoard';
import { PhotoboardService } from '../../shared/services/photoboard.service';
import { ApiService } from '../../shared/services/api.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NewBoardModalComponent } from './new-board-modal/new-board-modal.component';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-photo-board',
  templateUrl: './photo-board.component.html',
  styleUrls: ['./photo-board.component.scss'],
})
export class PhotoBoardComponent implements OnInit {
  images: Image[] = [];
  dirtyImages: Image[] = [];
  boards: Board[] = [];
  dirtyBoards: Board[] = [];

  newImageUrl: string = '';
  selectedBoard: Board = {
    _id: -1,
    title: '',
  };

  placements = ['top', 'left', 'right', 'bottom'];
  popoverTitle = 'Are you sure?';
  popoverMessage = 'Are you really <b>sure</b> you want to do this?';
  confirmText = 'Yes <i class="fas fa-check"></i>';
  cancelText = 'No <i class="fas fa-times"></i>';
  trackByValue: TrackByFunction<string> = (index, value) => value;

  spinnerMessage: string = '';
  selectedImage: Image | null = null;

  get getBoardImages() {
    return this.images.filter(
      (image) => image.board === this.selectedBoard._id
    );
  }

  constructor(
    private photoboardService: PhotoboardService,
    public apiService: ApiService,
    private modalService: NgbModal,
    private toastrService: ToastrService,
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit(): void {
    this.getBoards();
    this.getImages();
  }

  getImages(): void {
    this.spinnerMessage = 'Loading images...';
    this.spinner.show('photo-board-spinner');
    this.apiService.getImages().subscribe((images: Image[]) => {
      this.images = images;
      this.dirtyImages = [];
      this.spinner.hide('photo-board-spinner');
    });
  }

  getBoards(): void {
    this.spinnerMessage = 'Loading boards...';
    this.spinner.show('photo-board-spinner');
    this.apiService.getBoards().subscribe((boards: Board[]) => {
      if (boards && boards.length) {
        this.boards = boards;
        this.dirtyBoards = [];
        this.selectedBoard =
          this.selectedBoard._id === -1 ? boards[0] : this.selectedBoard;
        this.spinner.hide('photo-board-spinner');
      }
    });
  }

  getTags(): void {
    this.spinnerMessage = 'Loading tags...';
    this.spinner.show('photo-board-spinner');
    this.apiService.getTags(this.images).subscribe((images) => {
      if (images.length) {
        const updatedImages = this.images.map((image) => {
          const updatedImage = images.filter(
            (u_image) => u_image._id === image._id
          );
          return updatedImage.length ? updatedImage[0] : image;
        });
        this.dirtyImages = this.dirtyImages.map((image) => {
          const updatedImage = images.filter(
            (u_image) => u_image._id === image._id
          );
          return updatedImage.length ? updatedImage[0] : image;
        });
        if (!this.dirtyImages.length) this.dirtyImages = images;
        this.images = updatedImages;
        console.log(this.images, 'hey');
      }
      this.spinner.hide('photo-board-spinner');
    });
  }

  addImage(): void {
    const isExisted = this.images.find(
      (img) =>
        img.url === this.newImageUrl && img.board === this.selectedBoard._id
    );
    if (isExisted) {
      this.toastrService.error('This file was already existed in this board!');
      this.newImageUrl = '';
    } else {
      this.spinnerMessage = 'Adding image...';
      this.spinner.show('photo-board-spinner');
      this.apiService.hasImage(this.newImageUrl).subscribe((value: boolean) => {
        if (value === true) {
          const newImage: Image = {
            _id: this.images.length + 1,
            url: this.newImageUrl,
            board: this.selectedBoard._id,
          };
          this.dirtyImages = [...this.dirtyImages, newImage];
          this.images = [...this.images, newImage];
          this.newImageUrl = '';
        } else {
          this.toastrService.error('Invalid url');
        }
        this.spinner.hide('photo-board-spinner');
      });
    }
  }

  checkUrl(): boolean {
    const hasDomain = /(http(s?)):\/\//i.test(this.newImageUrl);
    return !hasDomain;
  }

  detectUpdates(): boolean {
    return !(this.dirtyBoards.length || this.dirtyImages.length);
  }

  onDismissUpdate(): void {
    this.getBoards();
    this.getImages();
    this.dirtyBoards = this.dirtyImages = [];
  }

  createBoard(): void {
    const modalRef = this.modalService.open(NewBoardModalComponent, {
      centered: true,
    });
    modalRef.result.then((title) => {
      if (title) {
        const newBoard: Board = {
          _id: this.boards.length + 1,
          title,
        };
        this.boards = [...this.boards, newBoard];
        this.dirtyBoards = [...this.dirtyBoards, newBoard];
      }
    });
  }

  getThumnailTags(tags: Tag[] | null) {
    return tags && tags.slice(0, 1);
  }

  showMore(selectedImage: Image) {
    return !!(selectedImage && selectedImage?.tags?.length)
  }

  onSave(): void {
    this.spinnerMessage = 'Saving data...';
    this.spinner.show('photo-board-spinner');
    this.apiService.addBoards(this.dirtyBoards).subscribe((boards: Board[]) => {
      this.apiService
        .addImages(this.dirtyImages)
        .subscribe((images: Image[]) => {
          this.getBoards();
          this.getImages();
          this.toastrService.success('Saving was successfully.');
          this.spinner.hide('photo-board-spinner');
        });
    });
  }
}