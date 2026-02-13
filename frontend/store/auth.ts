import { create } from 'zustand';
import { User } from '../types';
import { authApi } from '../lib/api';

interface AuthState {
	user: User | null
	isLoading: boolean
	isAuthenticated: boolean

	setUser: (user: User | null) => void
	login: (email: string, password: string) => Promise<void>
	logout: () => Promise<void>
	register: (email: string, password: string, fullName?: string) => Promise<void>
	restoreSession: () => Promise<void>


}

