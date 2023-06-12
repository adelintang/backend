import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import UserModal from "./modal.js"
// import User from './modal.js'

export const getUser = async (req , res) =>{
    try {
        const users = await UserModal.findAll()
        res.status(200).json({
        data: users,
        metadata: "test user endpoint"
    })
    } catch (e) {
        res.status(400).json({
        error: "invalid"
        })
    }
}

export const getUserById = (req , res) => {}
export const createUser  = async (req , res) => {}

export const updateUser  = async (req , res) => {
    const username = req.user.name;
    const { email, password } = req.body;

    try {
        const hashPassword = await bcrypt.hash(password, 10);
        const user = await UserModal.update({ email, password: hashPassword }, { where: { name: username } });

        if (user[0] === 0) {
            throw Error();
        }

        res.status(200).json({
            status: 'success', message: 'user berhasil diperbarui'
        });
    } catch(e) {
        res.status(404).json({
            status: 'fail', message: 'user not found'
        });
    }
}

export const deleteUser  = async (req , res) => {
    const username = req.user.name;
    
    try {
        const user = await UserModal.destroy({ where: { name: username } });
        if (user === 0) {
            throw Error();
        }

        res.status(200).json({
            status: 'success', message: 'user berhasil dihapus'
        });
    } catch(e) {
        res.status(404).json({
            status: 'fail', message: 'user not found'
        });
    }
}

export const register = async (req, res) => {
    const { name, email, password } = req.body
    
    try {
        const user = await UserModal.findAll()
        const duplicateName = user.find((user) => user.name === name)

        if (duplicateName) {
            res.status(409).json({
                status: 'fail', message: 'name duplicate'
            })
        } else {
            const hashPaswword = await bcrypt.hash(password, 10);

            const result = await UserModal.create({
                name,
                email,
                password: hashPaswword
            })

            res.status(201).json({
                status: 'success', message: 'register successfully', data: { id: result.dataValues.id }
            })
        }
    } catch (e) {
        res.status(400).json({
            status: 'fail', message: `${e.name}: ${e.message}`
        })
    }
}

const generateAccesToken = (name) => {
  return jwt.sign(name, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30s' });
}


export const tokenHandler = async (req, res) => {
    const cookies = req.cookies;
    
    if (!cookies?.jwt) return res.sendStatus(401);
    const refreshToken = cookies.jwt;
    
    const foundUser = await UserModal.findOne({ where: { refreshToken } });
    const user = foundUser.dataValues;

    if (!user) return res.sendStatus(403);

    try {
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
            if (err) throw err;
            const accessToken = generateAccesToken({ name: user.name });
            
            res.json({ accessToken });
        });
    } catch(e) {
        return res.sendStatus(403);
    }
}

export const loginAuth = async (req, res) => {
    const { email, password } = req.body
    
    try {
        const foundUser = await UserModal.findOne({
            where: { email }
        })
        
        const user = foundUser.dataValues;
        
        if (!user) {
            res.status(401).json({
                status: 'fail', message: 'user not found'
            })
        }

        const match = await bcrypt.compare(password, user.password);

        if (match) {
            const username = { name: user.name };
            const accessToken = generateAccesToken(username);
            const refreshToken = jwt.sign(username, process.env.REFRESH_TOKEN_SECRET);

            await UserModal.update({ refreshToken }, { where: { name: user.name } });

            res.cookie('jwt', refreshToken, { httpOnly: true, sameSite: 'None' });
            res.status(200).json({
                status: 'success', accessToken
            })
        } else {
            res.status(401).json({
                status: 'fail', message: 'user not found'
            })
        }
    } catch(e) {
        res.status(404).json({
            status: 'fail', message: 'user not found!'
        })
    }
}

export const logoutHandler = async (req, res) => {
    const cookies = req.cookies

    if (!cookies?.jwt) res.sendStatus(204);

    const refreshToken = cookies.jwt;
    const foundUser = await UserModal.findOne({ where: { refreshToken } });
    const user = foundUser.dataValues;

    if (!user) {
        res.clearCookie('jwt', { httpOnly: true, sameSite: 'None' });
        res.sendStatus(204);
    }

    try {
        await UserModal.update({ refreshToken: '' }, { where: { refreshToken } });
        res.clearCookie('jwt', { httpOnly: true, sameSite: 'None' });
        res.sendStatus(204);
    } catch(e) {
        res.json({ message: `${e.name}: ${e.message}` });
    }
}