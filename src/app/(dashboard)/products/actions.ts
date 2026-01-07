'use server';

import {
  generateProductDescription,
  type GenerateProductDescriptionInput,
} from '@/ai/flows/generate-product-descriptions';

export async function generateDescriptionAction(
  input: GenerateProductDescriptionInput
): Promise<{ description: string | null; error: string | null }> {
  try {
    const result = await generateProductDescription(input);
    if (!result || !result.description) {
      return { description: null, error: 'Failed to generate description.' };
    }
    return { description: result.description, error: null };
  } catch (error) {
    console.error(error);
    return { description: null, error: 'An unexpected error occurred.' };
  }
}
