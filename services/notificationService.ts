import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';

export async function registerForPushNotificationsAsync() {
    let token;
    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            Alert.alert('Failed to get push token! Please check your settings.');
            return;
        }
        token = (await Notifications.getExpoPushTokenAsync()).data;
    }

    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    return token;
}

export async function scheduleLoanReminder(
    loanId: string,
    contactName: string,
    amount: number,
    dueDate: string,
    category: 'money' | 'item' = 'money',
    frequency: string = 'none',
    interval: number = 1
) {
    const triggerDate = new Date(dueDate);
    triggerDate.setHours(9, 0, 0, 0);

    const body = category === 'money'
        ? `Reminder: ${contactName} owes you $${amount.toLocaleString()}.`
        : `Reminder: ${contactName} should return an item to you.`;

    const title = category === 'money' ? 'Payment Reminder! 💰' : 'Item Return Reminder! 📦';

    let trigger: any;

    if (frequency === 'none') {
        if (triggerDate < new Date()) return;
        trigger = triggerDate;
    } else if (frequency === 'daily') {
        trigger = {
            hour: 9,
            minute: 0,
            repeats: true,
        };
    } else if (frequency === 'weekly') {
        trigger = {
            weekday: triggerDate.getDay() + 1, // Expo uses 1-7 for Sunday-Saturday
            hour: 9,
            minute: 0,
            repeats: true,
        };
    } else if (frequency === 'monthly') {
        trigger = {
            day: triggerDate.getDate(),
            hour: 9,
            minute: 0,
            repeats: true,
        };
    } else if (frequency === 'yearly') {
        trigger = {
            month: triggerDate.getMonth(),
            day: triggerDate.getDate(),
            hour: 9,
            minute: 0,
            repeats: true,
        };
    } else if (frequency === 'custom') {
        trigger = {
            seconds: interval * 24 * 60 * 60,
            repeats: true,
        };
    }

    await Notifications.scheduleNotificationAsync({
        content: {
            title: title,
            body: body,
            data: { loanId },
        },
        trigger,
    });
}
