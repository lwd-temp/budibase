import {
  User,
  Table,
  SearchFilters,
  Row,
  ViewV2Schema,
  ViewV2,
  ViewV2Type,
} from "@budibase/types"
import { HttpMethod, MakeRequestResponse, generateMakeRequest } from "./utils"
import TestConfiguration from "../../../../tests/utilities/TestConfiguration"

type RequestOpts = { internal?: boolean; appId?: string }

type Response<T> = { data: T }

export interface PublicAPIExpectations {
  status?: number
  body?: Record<string, any>
}

export class PublicAPIRequest {
  private makeRequest: MakeRequestResponse
  private appId: string | undefined

  tables: PublicTableAPI
  views: PublicViewAPI
  rows: PublicRowAPI
  apiKey: string

  private constructor(
    apiKey: string,
    makeRequest: MakeRequestResponse,
    appId?: string
  ) {
    this.apiKey = apiKey
    this.makeRequest = makeRequest
    this.appId = appId
    this.tables = new PublicTableAPI(this)
    this.rows = new PublicRowAPI(this)
    this.views = new PublicViewAPI(this)
  }

  static async init(config: TestConfiguration, user: User, opts?: RequestOpts) {
    const apiKey = await config.generateApiKey(user._id)
    const makeRequest = generateMakeRequest(apiKey, opts)
    return new this(apiKey, makeRequest, opts?.appId)
  }

  opts(opts: RequestOpts) {
    if (opts.appId) {
      this.appId = opts.appId
    }
    this.makeRequest = generateMakeRequest(this.apiKey, opts)
  }

  async send(
    method: HttpMethod,
    endpoint: string,
    body?: any,
    expectations?: PublicAPIExpectations
  ) {
    if (!this.makeRequest) {
      throw new Error("Init has not been called")
    }
    const res = await this.makeRequest(method, endpoint, body, this.appId)
    if (expectations?.status) {
      expect(res.status).toEqual(expectations.status)
    }
    if (expectations?.body) {
      expect(res.body).toEqual(expectations?.body)
    }
    return res.body
  }
}

export class PublicTableAPI {
  request: PublicAPIRequest

  constructor(request: PublicAPIRequest) {
    this.request = request
  }

  async create(
    table: Table,
    expectations?: PublicAPIExpectations
  ): Promise<Response<Table>> {
    return this.request.send("post", "/tables", table, expectations)
  }
}

export class PublicRowAPI {
  request: PublicAPIRequest

  constructor(request: PublicAPIRequest) {
    this.request = request
  }

  async search(
    tableId: string,
    query: SearchFilters,
    expectations?: PublicAPIExpectations
  ): Promise<Response<Row[]>> {
    return this.request.send(
      "post",
      `/tables/${tableId}/rows/search`,
      {
        query,
      },
      expectations
    )
  }

  async viewSearch(
    viewId: string,
    query: SearchFilters,
    expectations?: PublicAPIExpectations
  ): Promise<Response<Row[]>> {
    return this.request.send(
      "post",
      `/views/${viewId}/rows/search`,
      {
        query,
      },
      expectations
    )
  }
}

export class PublicViewAPI {
  request: PublicAPIRequest

  constructor(request: PublicAPIRequest) {
    this.request = request
  }

  async create(
    view: Omit<ViewV2, "id" | "version">,
    expectations?: PublicAPIExpectations
  ): Promise<Response<ViewV2>> {
    return this.request.send("post", "/views", view, expectations)
  }

  async update(
    viewId: string,
    view: Omit<ViewV2, "id" | "version">,
    expectations?: PublicAPIExpectations
  ): Promise<Response<ViewV2>> {
    return this.request.send("put", `/views/${viewId}`, view, expectations)
  }

  async destroy(
    viewId: string,
    expectations?: PublicAPIExpectations
  ): Promise<void> {
    return this.request.send(
      "delete",
      `/views/${viewId}`,
      undefined,
      expectations
    )
  }

  async find(
    viewId: string,
    expectations?: PublicAPIExpectations
  ): Promise<Response<ViewV2>> {
    return this.request.send("get", `/views/${viewId}`, undefined, expectations)
  }

  async fetch(
    expectations?: PublicAPIExpectations
  ): Promise<Response<ViewV2[]>> {
    return this.request.send("get", "/views", undefined, expectations)
  }
}
