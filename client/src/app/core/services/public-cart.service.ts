import { Injectable, computed, signal } from '@angular/core';

export interface CartSnack {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

const STORAGE_KEY = 'cloudx-public-cart';

@Injectable({ providedIn: 'root' })
export class PublicCartService {
  private snacks = signal<CartSnack[]>(this.loadSnacks());

  snackItems = this.snacks.asReadonly();

  snackCount = computed(() => this.snacks().reduce((sum, item) => sum + item.quantity, 0));

  snackTotal = computed(() =>
    this.snacks().reduce((sum, item) => sum + item.price * item.quantity, 0),
  );

  addSnack(productId: string, name: string, price: number) {
    this.snacks.update((items) => {
      const existing = items.find((i) => i.productId === productId);
      if (existing) {
        return items.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...items, { productId, name, price, quantity: 1 }];
    });
    this.persist();
  }

  removeSnack(productId: string) {
    this.snacks.update((items) => items.filter((i) => i.productId !== productId));
    this.persist();
  }

  setSnackQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      this.removeSnack(productId);
      return;
    }
    this.snacks.update((items) =>
      items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    );
    this.persist();
  }

  clearSnacks() {
    this.snacks.set([]);
    this.persist();
  }

  notesLine(): string {
    const items = this.snacks();
    if (!items.length) return '';
    const parts = items.map((i) => `${i.name} ×${i.quantity}`);
    return `Snacks requested: ${parts.join(', ')}`;
  }

  private loadSnacks(): CartSnack[] {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as CartSnack[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persist() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.snacks()));
    } catch {
      /* ignore quota errors */
    }
  }
}
