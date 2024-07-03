import { User, UserStatus } from "@budibase/types"
import { DBTestConfiguration, generator, structures } from "../../../tests"
import { UserDB } from "../db"

const db = UserDB

const config = new DBTestConfiguration()

const quotas = {
  addUsers: jest
    .fn()
    .mockImplementation(
      (_change: number, _creatorsChange: number, cb?: () => Promise<any>) =>
        cb && cb()
    ),
  removeUsers: jest
    .fn()
    .mockImplementation(
      (_change: number, _creatorsChange: number, cb?: () => Promise<any>) =>
        cb && cb()
    ),
}
const groups = {
  addUsers: jest.fn(),
  getBulk: jest.fn(),
  getGroupBuilderAppIds: jest.fn(),
}
const features = { isSSOEnforced: jest.fn(), isAppBuildersEnabled: jest.fn() }

describe("UserDB", () => {
  beforeAll(() => {
    db.init(quotas, groups, features)
  })

  describe("save", () => {
    describe("create", () => {
      it("creating a new user will persist it", async () => {
        const email = generator.email({})
        const user: User = structures.users.user({
          email,
          tenantId: config.getTenantId(),
        })

        await config.doInTenant(async () => {
          const saveUserResponse = await db.save(user)

          const persistedUser = await db.getUserByEmail(email)
          expect(persistedUser).toEqual({
            ...user,
            _id: saveUserResponse._id,
            _rev: expect.stringMatching(/^1-\w+/),
            password: expect.not.stringMatching(user.password!),
            status: UserStatus.ACTIVE,
            createdAt: Date.now(),
            updatedAt: new Date().toISOString(),
          })
        })
      })

      it("the same email cannot be used twice in the same tenant", async () => {
        const email = generator.email({})
        const user: User = structures.users.user({
          email,
          tenantId: config.getTenantId(),
        })

        await config.doInTenant(() => db.save(user))

        await config.doInTenant(() =>
          expect(db.save(user)).rejects.toThrow(
            `Email already in use: '${email}'`
          )
        )
      })

      it("the same email cannot be used twice in different tenants", async () => {
        const email = generator.email({})
        const user: User = structures.users.user({
          email,
          tenantId: config.getTenantId(),
        })

        await config.doInTenant(() => db.save(user))

        config.newTenant()
        await config.doInTenant(() =>
          expect(db.save(user)).rejects.toThrow(
            `Email already in use: '${email}'`
          )
        )
      })
    })

    describe("update", () => {
      let user: User

      beforeEach(async () => {
        user = await config.doInTenant(() =>
          db.save(
            structures.users.user({
              email: generator.email({}),
              tenantId: config.getTenantId(),
            })
          )
        )
      })

      it("can update user properties", async () => {
        await config.doInTenant(async () => {
          const updatedName = generator.first()
          user.firstName = updatedName

          await db.save(user)

          const persistedUser = await db.getUserByEmail(user.email)
          expect(persistedUser).toEqual(
            expect.objectContaining({
              _id: user._id,
              email: user.email,
              firstName: updatedName,
              lastName: user.lastName,
            })
          )
        })
      })
    })
  })
})
