import {
    createUser,
    getUser,
    getUserById
} from '../services/databaseService.js';

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const saltRounds = 10;

export const postUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                error: "All Fields are required"
            })
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: 'Minimum 8 characters password is required'
            })
        }

        const checkUserExists = await getUser(email);
        if (checkUserExists) {
            return res.status(409).json({
                error: 'User already exists'
            })
        }


        const passwordHash = await bcrypt.hash(password, saltRounds)

        const user = await createUser(email, passwordHash)
        res.status(201).json({
            message: 'User created successfully',
            user
        })
    } catch (err) {
        console.log(err);
        res.status(500).json({
            error: "Internal Server Error",
        })
    }

}

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'All fields are required'
            })
        }

        const user = await getUser(email);

        if (!user) {
            return res.status(401).json({
                error: 'Invalid Credentials'
            })
        }

        const checkPassword = await bcrypt.compare(password, user.password_hash)
        if (!checkPassword) {
            return res.status(401).json({
                error: 'Invalid Credentials'
            })
        }

        const token = jwt.sign({
            userId: user.id,
            email: user.email
        },
            process.env.JWT_SECRET,
            { expiresIn: '7d' })

        return res.status(200).json({
            message: 'Login successful',
            token
        })

    } catch (err) {
        console.log(err);
        res.status(500).json({
            error: 'Internal Server Error'
        })
    }

}

export const getProfile = async (req, res) => {
    const id = req.user.userId;
    const profile = await getUserById(id)
    res.status(200).json({
        profile
    })
}