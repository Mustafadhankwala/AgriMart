const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const UserSchema = new mongoose.Schema({
    email: String,
    role: String,
    name: String
});
const User = mongoose.model('User', UserSchema);

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: 'kj@gmail.com' });
        console.log('User found:', JSON.stringify(user, null, 2));
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkUser();
