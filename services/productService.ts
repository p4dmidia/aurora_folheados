import { supabase } from '../lib/supabase';

export interface Product {
    id: string;
    sku: string;
    nome: string;
    categoria: string;
    preco: number;
    custo: number;
    imagem_url?: string;
    material?: string;
    colecao?: string;
    created_at?: string;
}

export const productService = {
    async getProducts() {
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching products:', error);
            throw error;
        }
        return data as Product[];
    },

    async createProduct(product: Omit<Product, 'id' | 'created_at'>) {
        const { data, error } = await supabase
            .from('produtos')
            .insert([product])
            .select();

        if (error) {
            console.error('Error creating product:', error);
            throw error;
        }
        if (!data || data.length === 0) throw new Error('No product data returned after insert');
        return data[0] as Product;
    },

    async updateProduct(id: string, updates: Partial<Product>) {
        const { data, error } = await supabase
            .from('produtos')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error updating product:', error);
            throw error;
        }
        return data[0] as Product;
    },

    async deleteProduct(id: string) {
        const { error } = await supabase
            .from('produtos')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
