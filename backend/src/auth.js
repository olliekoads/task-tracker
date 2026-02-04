import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const allowedEmails = (process.env.ALLOWED_EMAILS || '').split(',').map(e => e.trim());

export async function verifyToken(token) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    
    if (!allowedEmails.includes(payload.email)) {
      throw new Error('Email not authorized');
    }
    
    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };
  } catch (error) {
    throw new Error('Invalid token: ' + error.message);
  }
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  
  verifyToken(token)
    .then(user => {
      req.user = user;
      next();
    })
    .catch(error => {
      res.status(401).json({ error: error.message });
    });
}
