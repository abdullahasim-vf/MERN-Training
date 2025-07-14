const express = require('express');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
 
app.use((req, res, next) => {
  console.log(`IP: ${req.ip}, Method: ${req.method}, URL: ${req.originalUrl}`);
  next();
});

const mongoURI = 'mongodb+srv://abdullahasim:abdullah2091@test.agwecmf.mongodb.net/?retryWrites=true&w=majority&appName=Test';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));


const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: { type: Number, required: false },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);


app.post('/users', async (req, res, next) => {
  try {

    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email must be unique' });
    }
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

app.get('/users', async (req, res, next) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

app.put('/users/:id', async (req, res, next) => {
  try {
    if (req.body.email) {
      const existingUser = await User.findOne({ email: req.body.email, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email must be unique' });
      }
    }
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

app.delete('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
});


app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 