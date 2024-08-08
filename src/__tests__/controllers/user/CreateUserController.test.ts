import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { CreateUserService } from '../../../services/user/CreateUserService';
import { isValidPassword } from '../../../utils/validations/isValidPassword';
import { isValidRequest } from '../../../utils/validations/isValidRequest';
import { generateUserErrorResponse } from '../../../utils/generateUserErrorResponse';
import { UserDomain } from '../../../domain/UserDomain';
import { RoleDomain } from '../../../domain/RoleDomain';
import { createUserTypes } from '../../../@types/user/createUserTypes';
import { UserRepository } from '../../../repository/implementation/UserRepository';
import { PrismaClient } from '@prisma/client';
import { IRoleRepository } from '../../../repository/interfaces/IRoleRepository';
import { IUserRepository } from '../../../repository/interfaces/IUserRepository';
import { CreateUserController } from '../../../controllers/user/CreateUserController';

vi.mock('../../../utils/validations/isValidPassword');
vi.mock('../../../utils/validations/isValidRequest');
vi.mock('../../../utils/generateUserErrorResponse', () => {
	return {
		generateUserErrorResponse: vi.fn(),
	};
});

vi.mock('../../../loggers/Logger', () => {
	return {
		Logger: vi.fn().mockImplementation(() => {
			return {
				warn: vi.fn(),
				error: vi.fn(),
				info: vi.fn(),
			};
		}),
	};
});

describe('CreateUserController', () => {
	let createUserController: CreateUserController;
	let req: Partial<Request>;
	let res: Partial<Response>;
	let createUserService: CreateUserService;
	let userRepository: IUserRepository;
	let prismaClient: PrismaClient;
	let roleRepository: IRoleRepository;

	beforeEach(() => {
		vi.clearAllMocks();

		prismaClient = new PrismaClient();
		userRepository = new UserRepository(prismaClient);
		roleRepository = {} as IRoleRepository;

		createUserService = new CreateUserService(userRepository, roleRepository);
		createUserService.execute = vi.fn();

		createUserController = new CreateUserController(createUserService);

		req = {
			body: {
				userName: 'Test User',
				userEmail: 'test@example.com',
				userPassword: 'Password123',
				roleId: 1,
				roleTitle: 'Admin',
				requestUserId: '1',
			},
		};

		res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
		};
	});

	it('should return 400 if request is invalid', async () => {
		(isValidRequest as any).mockReturnValue(false);

		await createUserController.createUser(req as Request, res as Response);

		expect(isValidRequest).toHaveBeenCalledWith(req.body, createUserTypes);
		expect(generateUserErrorResponse).toHaveBeenCalledWith(res, 'Dados Inválidos', 400);
	});

	it('should return 400 if password is invalid', async () => {
		(isValidRequest as any).mockReturnValue(true);
		(isValidPassword as any).mockReturnValue(false);

		await createUserController.createUser(req as Request, res as Response);

		expect(isValidPassword).toHaveBeenCalledWith(req.body.userPassword);
		expect(generateUserErrorResponse).toHaveBeenCalledWith(res, 'Senha Inválida', 400);
	});

	it('should return 201 if user is created successfully', async () => {
		(isValidRequest as any).mockReturnValue(true);
		(isValidPassword as any).mockReturnValue(true);

		const user = new UserDomain({
			userName: 'Test User',
			userEmail: 'test@example.com',
			userPassword: 'Password123',
			role: new RoleDomain({
				roleId: 1,
				roleTitle: 'Admin',
			}),
		});

		(createUserService.execute as any).mockResolvedValue(user);

		await createUserController.createUser(req as Request, res as Response);

		expect(createUserService.execute).toHaveBeenCalledWith(expect.any(UserDomain));
		expect(res.status).toHaveBeenCalledWith(201);
		expect(res.json).toHaveBeenCalledWith({
			user,
			msg: 'Usuário criado com sucesso',
		});
	});

	it('should return 500 if there is an internal server error', async () => {
		(isValidRequest as any).mockReturnValue(true);
		(isValidPassword as any).mockReturnValue(true);

		const error = new Error('Erro ao criar usuário');
		(createUserService.execute as any).mockRejectedValue(error);

		await createUserController.createUser(req as Request, res as Response);

		expect(createUserService.execute).toHaveBeenCalledWith(expect.any(UserDomain));
		expect(generateUserErrorResponse).toHaveBeenCalledTimes(1);
		expect(generateUserErrorResponse).toHaveBeenCalledWith(
			res,
			'Erro ao criar usuário',
			500
		);
	});
});
