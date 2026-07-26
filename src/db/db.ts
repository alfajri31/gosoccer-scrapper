import mongoose from 'mongoose';
import 'dotenv/config';

export async function connectDatabase(): Promise<void> {
    const uri ='mongodb://admin:admin123@fajris-mac-mini.tail2fab46.ts.net:27017/gosoccer?authSource=admin';

    if(!uri) {
        throw new Error('MONGODB URI is not defined')
    }

    await mongoose.connect(uri);
    console.log("db successfully connected");
}