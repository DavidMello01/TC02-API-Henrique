import { Request, Response } from 'express';
import { isValidPassword } from '../../utils/validations/isValidPassword';
import { isValidRequest } from '../../utils/validations/isValidRequest';
import { generateUserErrorResponse } from '../../utils/generateUserErrorResponse';
import { UserDomain } from '../../domain/UserDomain';
import { Logger } from '../../loggers/Logger';
import { userLogPath } from '../../config/logPaths';
import { LoginUserService } from '../../services/user/LoginUserService';
import { loginUserTypes } from '../../@types/user/loginUserTypes';

export class LoginUserController {
	private loginUserService: LoginUserService;
	private logger: Logger;

	constructor(loginUserService: LoginUserService) {
		this.logger = new Logger('LoginUserController', userLogPath);
		this.loginUserService = loginUserService;
		this.loginUser = this.loginUser.bind(this);
	}

	async loginUser(req: Request, res: Response) {
		if (!isValidRequest(req.body, loginUserTypes)) {
			this.logger.warn(`Invalid Data on Login by user email: ${req.body.userEmail}`);
			return generateUserErrorResponse(res, 'Dados Inválidos', 400);
		}

		if (!isValidPassword(req.body.userPassword)) {
			this.logger.warn(`Invalid Password on Login by user email: ${req.body.userEmail}`);
			return generateUserErrorResponse(res, 'Senha Inválida', 400);
		}

		try {
			const user = await this.loginUserService.execute(
				new UserDomain({
					userEmail: req.body.userEmail,
					userPassword: req.body.userPassword,
				})
			);

			if (!user) {
				this.logger.warn('Incorrect Email/Password');
				return res.status(401).json({
					user: undefined,
					msg: 'Email ou senha incorretos',
				});
			}

			this.logger.info(`User Logged`, req.body.userEmail);
			res.cookie('token', user.getAccessToken(), {
				httpOnly: true,
				secure: true,
				sameSite: 'strict',
			});

			return res.status(201).json({
				user,
				msg: 'Usuário logado com sucesso',
				accessToken: user.getAccessToken(),
				accessTokenExpiration: user.getAccessTokenExpiration(),
			});
		} catch (error) {
			this.logger.error('Error when logging user', req.body.userEmail, error);
			return generateUserErrorResponse(res, 'Erro interno do servidor', 500);
		}
	}
}
