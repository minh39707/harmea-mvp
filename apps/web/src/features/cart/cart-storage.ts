import type { Item } from '../../shared/types';
import { blankDesign as blank } from '../../shared/types';
export function loadCart(): Item[] {
  try {
    const v = JSON.parse(localStorage.getItem('harmea.cart.v2') ?? '[]');
    return Array.isArray(v)
      ? v
          .filter(
            i =>
              i &&
              typeof i.id === 'string' &&
              typeof i.productId === 'string' &&
              Number.isInteger(i.quantity) &&
              i.quantity >= 1 &&
              i.quantity <= 10 &&
              i.design &&
              Object.keys(blank).every(k => typeof i.design[k] === 'string')
          )
          .slice(0, 10)
      : [];
  } catch {
    return [];
  }
}

export function saveCart(cart: Item[]) {
  localStorage.setItem('harmea.cart.v2', JSON.stringify(cart));
}
