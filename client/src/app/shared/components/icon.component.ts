import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    @if (swap) {
      <span class="t-icon-swap" [attr.data-state]="filled ? 'b' : 'a'" [style.width.px]="sizePx" [style.height.px]="sizePx">
        <span class="t-icon material-symbols-outlined" data-icon="a" [style.font-size.px]="sizePx">{{ name }}</span>
        <span
          class="t-icon material-symbols-outlined t-icon-filled"
          data-icon="b"
          [style.font-size.px]="sizePx"
        >{{ name }}</span>
      </span>
    } @else {
      <span
        class="material-symbols-outlined"
        [style.font-size.px]="sizePx"
        [style.font-variation-settings]="variationSettings"
        [attr.aria-hidden]="true"
      >{{ name }}</span>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        vertical-align: middle;
        line-height: 0;
        flex-shrink: 0;
      }

      .material-symbols-outlined {
        font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        line-height: 1;
        user-select: none;
      }

      .t-icon-filled {
        font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24;
      }
    `,
  ],
})
export class IconComponent {
  @Input({ required: true }) name!: string;
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() filled = false;
  /** Enable cross-fade blur swap between outline and filled variants. */
  @Input() swap = false;

  get variationSettings(): string {
    const fill = this.filled ? 1 : 0;
    const weight = this.filled ? 500 : 400;
    return `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`;
  }

  get sizePx(): number {
    switch (this.size) {
      case 'sm':
        return 18;
      case 'md':
        return 24;
      case 'lg':
        return 32;
      case 'xl':
        return 40;
    }
  }
}
