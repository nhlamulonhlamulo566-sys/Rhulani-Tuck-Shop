import type { Product, Sale, UserProfile } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => {
  const image = PlaceHolderImages.find(img => img.id === id);
  return image ? { url: image.imageUrl, hint: image.imageHint } : { url: 'https://picsum.photos/seed/default/600/400', hint: 'placeholder' };
};

export const mockUser: UserProfile = {
  id: 'user-1',
  name: 'Alex Doe',
  email: 'alex.doe@example.com',
  avatarUrl: 'https://picsum.photos/seed/avatar/150/150',
  role: 'administration',
};

export const mockProducts: Product[] = [
  // This data is now managed in Firestore. 
  // This file can be removed or kept for reference.
];

export const mockSales: Sale[] = [
  // This data is now managed in Firestore.
  // This file can be removed or kept for reference.
];
