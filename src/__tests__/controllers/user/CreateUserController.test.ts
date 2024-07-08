import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { CreateUserController } from '../../../controllers/user/CreateUserController';
import { CreateUserService } from '../../../services/user/CreateUserService';
import { isValidEmail } from '../../../utils/validations/isValidEmail';
import { isValidPassword } from '../../../utils/validations/isValidPassword';
import { isValidRequest } from '../../../utils/validations/isValidRequest';
import { generateErrorResponse } from '../../../utils/generateErrorResponse';
import { UserDomain } from '../../../domain/UserDomain';
import { RoleDomain } from '../../../domain/RoleDomain';
import { Logger } from '../../../loggers/Logger';
import { createUserTypes } from '../../../@types/user/createUserTypes';
import { UserRepository } from '../../../repository/implementation/UserRepository';
import { PrismaClient } from '@prisma/client';
import { IRoleRepository } from '../../../repository/interfaces/IRoleRepository';
import { IUserRepository } from '../../../repository/interfaces/IUserRepository';

// Mock das funções e classes necessárias
vi.mock('../../../utils/validations/isValidEmail');
vi.mock('../../../utils/validations/isValidPassword');
vi.mock('../../../utils/validations/isValidRequest');
vi.mock('../../../utils/generateErrorResponse');
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
        // Mocks do repositório e logger
        prismaClient = new PrismaClient();
        userRepository = new UserRepository(prismaClient);
        roleRepository = {} as IRoleRepository;  // Mock do RoleRepository

        createUserService = new CreateUserService(userRepository, roleRepository);
        createUserService.execute = vi.fn(); // Mock do método execute

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
        expect(generateErrorResponse).toHaveBeenCalledWith(res, 'Dados Inválidos', 400);
    });

    it('should return 400 if password is invalid', async () => {
        (isValidRequest as any).mockReturnValue(true);
        (isValidPassword as any).mockReturnValue(false);

        await createUserController.createUser(req as Request, res as Response);

        expect(isValidPassword).toHaveBeenCalledWith(req.body.userPassword);
        expect(generateErrorResponse).toHaveBeenCalledWith(res, 'Senha Inválida', 400);
    });

    it('should return 400 if email is invalid', async () => {
        (isValidRequest as any).mockReturnValue(true);
        (isValidPassword as any).mockReturnValue(true);
        (isValidEmail as any).mockReturnValue(false);

        await createUserController.createUser(req as Request, res as Response);

        expect(isValidEmail).toHaveBeenCalledWith(req.body.userEmail);
        expect(generateErrorResponse).toHaveBeenCalledWith(res, 'Email Inválido', 400);
    });

    it('should return 201 if user is created successfully', async () => {
        (isValidRequest as any).mockReturnValue(true);
        (isValidPassword as any).mockReturnValue(true);
        (isValidEmail as any).mockReturnValue(true);

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
        (isValidEmail as any).mockReturnValue(true);

        const error = new Error('Internal Server Error');
        (createUserService.execute as any).mockRejectedValue(error);

        await createUserController.createUser(req as Request, res as Response);

        expect(createUserService.execute).toHaveBeenCalledWith(expect.any(UserDomain));
        expect(generateErrorResponse).toHaveBeenCalledWith(res, 'Erro interno do servidor', 500);
    });
});
