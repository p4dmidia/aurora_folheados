import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

export const receiptService = {
    async generateReceipt(sale: any, items: any[], customer: any, paymentMethod: string) {
        // 80mm thermal printer width approx
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [80, 200] // dynamic height would be better but fixed for now
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        let yPos = 10;

        // Header
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('AURORA FOLHEADOS', pageWidth / 2, yPos, { align: 'center' });

        yPos += 5;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Comprovante de Venda', pageWidth / 2, yPos, { align: 'center' });

        yPos += 5;
        doc.text(format(new Date(), 'dd/MM/yyyy HH:mm'), pageWidth / 2, yPos, { align: 'center' });

        yPos += 8;
        // Customer Info
        doc.setFontSize(9);
        doc.text(`Cliente: ${customer.nome || 'Consumidor Final'}`, 5, yPos);
        if (customer.cpf) {
            yPos += 4;
            doc.text(`CPF: ${customer.cpf}`, 5, yPos);
        }

        yPos += 6;
        doc.line(5, yPos, pageWidth - 5, yPos);
        yPos += 5;

        // Items
        // @ts-ignore
        autoTable(doc, {
            startY: yPos,
            head: [['Item', 'Qtd', 'Val']],
            body: items.map(item => {
                const product = item.product || item.produto;
                const qty = item.quantidade ?? item.quantity;
                const price = item.preco_unitario ?? product.preco;

                return [
                    product.nome.substring(0, 15),
                    qty.toString(),
                    `R$ ${(price * qty).toFixed(2)}`
                ];
            }),
            theme: 'plain',
            styles: { fontSize: 8, cellPadding: 1 },
            headStyles: { fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 10, halign: 'center' },
                2: { cellWidth: 20, halign: 'right' }
            },
            margin: { left: 5, right: 5 },
        });

        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 5;

        doc.line(5, yPos, pageWidth - 5, yPos);
        yPos += 5;

        // Totals
        const subtotal = items.reduce((acc, item) => {
            const product = item.product || item.produto;
            const qty = item.quantidade ?? item.quantity;
            const price = item.preco_unitario ?? product.preco;
            return acc + (price * qty);
        }, 0);
        const isPixOrCash = paymentMethod === 'PIX' || paymentMethod === 'CASH' || paymentMethod === 'DINHEIRO';
        const discount = isPixOrCash ? subtotal * 0.1 : 0;
        const exchangeCredit = sale.appliedCredit || 0; // If we pass it
        const finalTotal = Math.max(0, subtotal - discount - exchangeCredit);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Subtotal: R$ ${subtotal.toFixed(2)}`, pageWidth - 5, yPos, { align: 'right' });

        if (discount > 0) {
            yPos += 4;
            doc.text(`Desconto (10%): - R$ ${discount.toFixed(2)}`, pageWidth - 5, yPos, { align: 'right' });
        }

        if (exchangeCredit > 0) {
            yPos += 4;
            doc.text(`Crédito Troca: - R$ ${exchangeCredit.toFixed(2)}`, pageWidth - 5, yPos, { align: 'right' });
        }

        yPos += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL PAGO: R$ ${finalTotal.toFixed(2)}`, pageWidth - 5, yPos, { align: 'right' });

        yPos += 5;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const paymentLabel = (paymentMethod === 'PIX') ? 'PIX' :
            (paymentMethod === 'CARD' || paymentMethod === 'CARTAO') ? 'Cartão de Crédito' :
                (paymentMethod === 'DINHEIRO' || paymentMethod === 'CASH') ? 'Dinheiro' :
                    paymentMethod;
        doc.text(`Forma de Pagamento: ${paymentLabel}`, pageWidth - 5, yPos, { align: 'right' });

        yPos += 10;
        doc.setFontSize(7);
        doc.text('Obrigado pela preferência!', pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;
        doc.text('Volte sempre!', pageWidth / 2, yPos, { align: 'center' });

        return doc.output('blob');
    },

    async ensureBucketExists() {
        // Check if we can access the bucket
        const { data, error } = await supabase.storage.getBucket('receipts');

        if (error && error.message.includes('not found')) {
            // Try to create it - ONLY works if using service role within RLS policy allowing it, unlikely for client but good fallback
            const { error: createError } = await supabase.storage.createBucket('receipts', {
                public: true
            });
            if (createError) {
                console.error('Error creating bucket:', createError);
                return false;
            }
            return true;
        }
        return !error;
    },

    async uploadReceipt(pdfBlob: Blob, saleId: string) {
        const fileName = `receipt_${saleId}_${Date.now()}.pdf`;

        // Ensure bucket exists or at least we tried
        // await this.ensureBucketExists(); // functionality limited by RLS

        const { data, error } = await supabase.storage
            .from('receipts')
            .upload(fileName, pdfBlob, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (error) {
            console.error('Supabase Storage Upload Error:', error);
            throw new Error(`Falha no upload: ${error.message} (Verifique se o bucket 'receipts' existe e é público)`);
        }
        return data.path;
    },

    getReceiptUrl(path: string) {
        const { data } = supabase.storage
            .from('receipts')
            .getPublicUrl(path);

        return data.publicUrl;
    }
};
