import mongoose from 'mongoose';

export const generateUniqueId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomStr}`;
};

export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const connectWithRetry = async (mongoose, uri, maxRetries = 3) => {
  try {
    await mongoose.connect(uri, {
      dbName: 'chatapp',
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
      authSource: 'admin'
    });
    console.log('✅ Conexión a MongoDB establecida');
    return true;
  } catch (error) {
    if (error.code === 18 || error.message.includes('bad auth')) {
      console.error('❌ Error de autenticación. Verifica usuario y contraseña');
      throw new Error('Error de autenticación en MongoDB');
    }
    console.error('❌ Error de conexión:', error.message);
    throw error;
  }
};

export const validateMongoUri = (uri) => {
  if (!uri || !uri.includes('mongodb+srv://')) {
    throw new Error('URI de MongoDB inválida o no definida');
  }
  try {
    const [protocol, rest] = uri.split('://');
    const [credentials] = rest.split('@');
    const [username, password] = credentials.split(':');
    
    if (!username || !password) {
      throw new Error('Credenciales incompletas en la URI');
    }
    return uri;
  } catch (error) {
    throw new Error('Formato de URI de MongoDB inválido');
  }
};
