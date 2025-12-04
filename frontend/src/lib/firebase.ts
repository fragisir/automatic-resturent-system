import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, remove, push } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Validate config
if (typeof window !== 'undefined' && (firebaseConfig.apiKey === "YOUR_API_KEY" || !firebaseConfig.apiKey)) {
    console.warn("⚠️ Firebase Config Warning: You are using default placeholder values. Please check your .env.local file.");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

console.log("🔥 Firebase Initialized with config:", {
    projectId: firebaseConfig.projectId,
    databaseURL: firebaseConfig.databaseURL
});

export interface StaffCall {
    id: string;
    tableNumber: number;
    timestamp: number;
    status: 'calling' | 'responded';
}

/**
 * Create a new staff call for a table
 */
export const createStaffCall = async (tableNumber: number): Promise<string> => {
    try {
        const callsRef = ref(database, 'staffCalls');
        const newCallRef = push(callsRef);

        const callData: Omit<StaffCall, 'id'> = {
            tableNumber,
            timestamp: Date.now(),
            status: 'calling'
        };

        await set(newCallRef, callData);
        console.log(`✅ Staff call created for table ${tableNumber}, ID: ${newCallRef.key}`);
        return newCallRef.key || '';
    } catch (error) {
        console.error("❌ Error creating staff call:", error);
        throw error;
    }
};

/**
 * Remove a staff call (when staff responds)
 */
export const removeStaffCall = async (callId: string): Promise<void> => {
    try {
        const callRef = ref(database, `staffCalls/${callId}`);
        await remove(callRef);
    } catch (error) {
        console.error("Error removing staff call:", error);
        throw error;
    }
};

/**
 * Listen to all active staff calls
 */
export const listenToStaffCalls = (
    callback: (calls: Record<string, StaffCall>) => void,
    errorCallback?: (error: Error) => void
): (() => void) => {
    const callsRef = ref(database, 'staffCalls');

    const unsubscribe = onValue(callsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Convert to Record with IDs
            const callsWithIds: Record<string, StaffCall> = {};
            Object.keys(data).forEach(key => {
                callsWithIds[key] = {
                    id: key,
                    ...data[key]
                };
            });
            callback(callsWithIds);
        } else {
            console.log("📭 No active staff calls found");
            callback({});
        }
    }, (error) => {
        console.error("❌ Error listening to staff calls:", error);
        if (errorCallback) errorCallback(error);
    });

    return unsubscribe;
};

/**
 * Listen to staff call for a specific table
 */
export const listenToTableCall = (
    tableNumber: number,
    callback: (call: StaffCall | null) => void,
    errorCallback?: (error: Error) => void
): (() => void) => {
    const callsRef = ref(database, 'staffCalls');

    const unsubscribe = onValue(callsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Find call for this table
            const tableCall = Object.entries(data).find(
                ([_, call]: [string, any]) => call.tableNumber === tableNumber
            );

            if (tableCall) {
                const [callId, callData] = tableCall as [string, Omit<StaffCall, 'id'>];
                callback({
                    id: callId,
                    ...callData
                });
            } else {
                callback(null);
            }
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("Error listening to table call:", error);
        if (errorCallback) errorCallback(error);
    });

    return unsubscribe;
};

export { database };
