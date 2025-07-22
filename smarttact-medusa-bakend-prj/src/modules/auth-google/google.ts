import crypto from "crypto"
import {
  AuthenticationInput,
  AuthenticationResponse,
  AuthIdentityProviderService,
  CustomerTypes,
  GoogleAuthProviderOptions,
  IAuthModuleService,
  ICustomerModuleService,
  Logger,
} from "@medusajs/framework/types"
import {
  AbstractAuthModuleProvider,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import jwt, { JwtPayload } from "jsonwebtoken"

type InjectedDependencies = {
  logger: Logger
  [Modules.CUSTOMER]: any
}

interface LocalServiceConfig extends GoogleAuthProviderOptions {}
export class GoogleAuthService extends AbstractAuthModuleProvider {
  static identifier = "google"
  static DISPLAY_NAME = "Google Authentication"

  protected config_: LocalServiceConfig
  protected logger_: Logger
  protected customerModuleService_: ICustomerModuleService

  static validateOptions(options: GoogleAuthProviderOptions) {
    if (!options.clientId) {
      throw new Error("Google clientId is required")
    }

    if (!options.clientSecret) {
      throw new Error("Google clientSecret is required")
    }

    if (!options.callbackUrl) {
      throw new Error("Google callbackUrl is required")
    }
  }

  constructor(
    container: InjectedDependencies,
    options: GoogleAuthProviderOptions,
  ) {
    // @ts-ignore
    super(...arguments)
    this.config_ = options
    this.logger_ = container.logger
    // this.modules_= modules
    this.customerModuleService_= container[Modules.CUSTOMER] 
    console.log()
    console.log("GoogleAuthService has been initialzied")
  }

  async register(_): Promise<AuthenticationResponse> {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Google does not support registration. Use method `authenticate` instead."
    )
  }

  async authenticate(
    req: AuthenticationInput,
    authIdentityService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    console.log('im called to autenticated')
    const query: Record<string, string> = req.query ?? {}
    const body: Record<string, string> = req.body ?? {}

    if (query.error) {
      console.log(query.error)
      return {
        success: false,
        error: `${query.error_description}, read more at: ${query.error_uri}`,
      }
    }

    const stateKey = crypto.randomBytes(32).toString("hex")
    const state = {
      callback_url: body?.callback_url ?? this.config_.callbackUrl,
    }

    await authIdentityService.setState(stateKey, state)
    console.log('trying to redirect')
    return this.getRedirect(this.config_.clientId, state.callback_url, stateKey)
  }

  async validateCallback(
    req: AuthenticationInput,
    authIdentityService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const query: Record<string, string> = req.query ?? {}
    const body: Record<string, string> = req.body ?? {}

    if (query.error) {
      return {
        success: false,
        error: `${query.error_description}, read more at: ${query.error_uri}`,
      }
    }

    const code = query?.code ?? body?.code
    if (!code) {
      return { success: false, error: "No code provided" }
    }

    const state = await authIdentityService.getState(query?.state as string)
    if (!state) {
      return { success: false, error: "No state provided, or session expired" }
    }
    const params = `client_id=${this.config_.clientId}&client_secret=${this.config_.clientSecret}&code=${code}&redirect_uri=${state.callback_url}&grant_type=authorization_code`

    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      })
      if(!response.ok){
        return { success: true, error: '' }
      }

      const data= await response.json()
      console.log(data, "response")
      const id_token= data.id_token;

      const { authIdentity, success } = await this.verify_(
        id_token,
        authIdentityService
      )

      return {
        success,
        authIdentity,
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }

  }

  async verify_(
    idToken: string | undefined,
    authIdentityService: AuthIdentityProviderService
  ) {
    if (!idToken) {
      return { success: false, error: "No ID found" }
    }


    const jwtData = jwt.decode(idToken, {
      complete: true,
    }) as JwtPayload
    const payload = jwtData.payload


    if (!payload.email_verified) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Email not verified, cannot proceed with authentication"
      )
    }

    const entity_id = payload.sub
    const userMetadata = {
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
      given_name: payload.given_name,
      family_name: payload.family_name,
    }

    let authIdentity

    try {
      authIdentity = await authIdentityService.retrieve({
        entity_id,
      })
      const customers= await this.customerModuleService_.listCustomers({email: payload.email})
      authIdentity.app_metadata={
          "customer_id": customers[0].id
      }
    } catch (error) {
      if (error.type === MedusaError.Types.NOT_FOUND) {
        const createdAuthIdentity = await authIdentityService.create({
          entity_id,
          user_metadata: userMetadata,
        })
        const customers= await this.customerModuleService_.createCustomers([{
          first_name: payload.given_name,
          last_name: payload.family_name,
          email: payload.email,
          has_account: true
        }])
        createdAuthIdentity.app_metadata={
          "customer_id": customers[0].id
        }
        authIdentity = createdAuthIdentity  
      } else {
        console.log(error)
        return { success: false, error: error.message }
      }
    }
    return {
      success: true,
      authIdentity,
    }
  }

  private getRedirect(clientId: string, callbackUrl: string, stateKey: string) {
    const authUrl = new URL(`https://accounts.google.com/o/oauth2/v2/auth`)
    authUrl.searchParams.set("redirect_uri", callbackUrl)
    authUrl.searchParams.set("client_id", clientId)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("scope", "email profile openid")
    authUrl.searchParams.set("state", stateKey)

    return { success: true, location: authUrl.toString() }
  }
}
