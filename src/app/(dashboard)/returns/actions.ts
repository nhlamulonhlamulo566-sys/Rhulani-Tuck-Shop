'use server';

import { adminDb } from '@/firebase/admin';
import { firestore } from 'firebase-admin';
import type { Sale } from '@/lib/types';

export async function voidTransactionAction(
  saleId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!saleId) {
    return { success: false, error: 'Sale ID is required.' };
  }

  try {
    const saleRef = adminDb.collection('sales').doc(saleId);

    await adminDb.runTransaction(async (transaction) => {
      const saleDoc = await transaction.get(saleRef);
      if (!saleDoc.exists) {
        throw new Error('Sale not found.');
      }

      const saleData = saleDoc.data() as Sale;

      if (saleData.status === 'voided') {
        throw new Error('This sale has already been voided.');
      }

      // Restore stock for each item in the sale that has not been returned yet
      for (const item of saleData.items) {
        const productRef = adminDb.collection('products').doc(item.productId);
        const stockToRestore = item.quantity - (item.returnedQuantity || 0);
        if (stockToRestore > 0) {
            transaction.update(productRef, {
                stock: firestore.FieldValue.increment(stockToRestore),
            });
        }
      }

      // Mark the sale as voided
      transaction.update(saleRef, { status: 'voided' });
    });

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error voiding transaction:', error);
    return { success: false, error: error.message || 'An unexpected error occurred.' };
  }
}

export async function returnItemsAction(
    saleId: string,
    itemsToReturn: { productId: string; quantity: number }[]
): Promise<{ success: boolean; error: string | null }> {
    if (!saleId || !itemsToReturn || itemsToReturn.length === 0) {
        return { success: false, error: 'Invalid input for returning items.' };
    }
    
    try {
        const saleRef = adminDb.collection('sales').doc(saleId);

        await adminDb.runTransaction(async (transaction) => {
            const saleDoc = await transaction.get(saleRef);
            if (!saleDoc.exists) {
                throw new Error('Sale not found.');
            }

            const saleData = saleDoc.data() as Sale;
            
            if (saleData.status === 'voided') {
                throw new Error('Cannot return items from a voided sale.');
            }

            const newItems = [...saleData.items];
            let allItemsReturned = true;

            for (const itemToReturn of itemsToReturn) {
                const itemIndex = newItems.findIndex(i => i.productId === itemToReturn.productId);
                if (itemIndex === -1) {
                    throw new Error(`Product ${itemToReturn.productId} not found in this sale.`);
                }
                
                const originalItem = newItems[itemIndex];
                const currentReturnedQty = originalItem.returnedQuantity || 0;
                const newReturnedQty = currentReturnedQty + itemToReturn.quantity;
                
                if (newReturnedQty > originalItem.quantity) {
                    throw new Error(`Cannot return more ${originalItem.productName} than were purchased.`);
                }
                
                newItems[itemIndex] = { ...originalItem, returnedQuantity: newReturnedQty };
                
                // Restore stock
                const productRef = adminDb.collection('products').doc(itemToReturn.productId);
                transaction.update(productRef, {
                    stock: firestore.FieldValue.increment(itemToReturn.quantity),
                });
            }

            // Check if all items are now fully returned
            for(const item of newItems) {
                if ((item.returnedQuantity || 0) < item.quantity) {
                    allItemsReturned = false;
                    break;
                }
            }
            
            const newStatus = allItemsReturned ? 'voided' : 'partially-returned';

            transaction.update(saleRef, { items: newItems, status: newStatus });
        });
        
        return { success: true, error: null };
    } catch (error: any) {
        console.error('Error processing return:', error);
        return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
}
