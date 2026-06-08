import ImageKit from "imagekit-javascript";

export const uploadMediaToImageKit = async (file, apiFetch) => {
  try {
    // 1. Get Auth Params from Backend
    const authRes = await apiFetch('/api/config/imagekit-auth');
    if (!authRes.ok) throw new Error('ImageKit Auth failed on backend');
    const authData = await authRes.json();
    
    // We need PublicKey and urlEndpoint from env, but since we are frontend, 
    // it's better if we pass them from backend or just use import.meta.env
    // We will assume import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY is set or we get it from config endpoint
    
    // For simplicity, let's just upload using a FormData endpoint if possible, 
    // or standard imagekit-javascript requires publicKey.
    
    const imagekit = new ImageKit({
      publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || 'your_public_key',
      urlEndpoint: import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/your_id',
      authenticationEndpoint: 'http://dummy' // overridden below
    });

    return new Promise((resolve, reject) => {
      imagekit.upload({
        file: file,
        fileName: file.name || `upload_${Date.now()}`,
        tags: ["linkflow"],
        token: authData.token,
        signature: authData.signature,
        expire: authData.expire,
      }, function(err, result) {
        if(err) reject(err);
        else resolve(result.url);
      });
    });
  } catch (error) {
    console.error("ImageKit Upload Error:", error);
    throw error;
  }
};
