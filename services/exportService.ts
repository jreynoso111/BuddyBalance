import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';
import { Alert } from 'react-native';

const documentDirectory = FileSystem.documentDirectory;
const EncodingType = FileSystem.EncodingType;

export const exportLoansToCSV = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('loans')
            .select('*, contacts(name)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) {
            Alert.alert('No data', 'You have no loan records to export.');
            return;
        }

        const header = 'ID,Contact,Amount,Type,Status,Description,Due Date,Created At\n';
        const rows = data.map(loan => {
            const contactName = loan.contacts?.name || 'Unknown';
            const description = (loan.description || '').replace(/,/g, ' ');
            return `${loan.id},"${contactName}",${loan.amount},${loan.type},${loan.status},"${description}",${loan.due_date || ''},${loan.created_at}`;
        }).join('\n');

        const csvContent = header + rows;
        const fileUri = FileSystem.documentDirectory + 'I_GOT_YOU_Report.csv';

        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
            encoding: FileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
                mimeType: 'text/csv',
                dialogTitle: 'Export Loan Data',
                UTI: 'public.comma-separated-values-text',
            });
        } else {
            Alert.alert('Error', 'Sharing is not available on this device');
        }
    } catch (error: any) {
        Alert.alert('Export Failed', error.message);
    }
};
