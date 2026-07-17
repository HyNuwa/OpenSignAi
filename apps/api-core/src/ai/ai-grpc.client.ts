import * as path from 'path'
import * as fs from 'fs'
import * as protoLoader from '@grpc/proto-loader'
import * as grpc from '@grpc/grpc-js'

const CANDIDATE_PATHS = [
  path.resolve(__dirname, '..', '..', 'proto', 'sign_interpreter.proto'),
  path.resolve(__dirname, '..', '..', '..', 'proto', 'sign_interpreter.proto'),
  path.resolve(__dirname, '..', '..', '..', '..', 'proto', 'sign_interpreter.proto'),
  path.resolve(__dirname, '..', '..', '..', '..', 'apps', 'ai-core', 'protos', 'sign_interpreter.proto'),
  path.resolve(process.cwd(), 'apps', 'ai-core', 'protos', 'sign_interpreter.proto'),
]

const PROTO_PATH = CANDIDATE_PATHS.find((p) => fs.existsSync(p))
if (!PROTO_PATH) {
  throw new Error(
    `sign_interpreter.proto not found. Searched: ${CANDIDATE_PATHS.join(', ')}`,
  )
}

export interface ProtoLandmark {
  x: number
  y: number
  z: number
}

export interface ProtoHandLandmarks {
  confidence: number
  landmarks: ProtoLandmark[]
}

export interface ProtoPoseFrame {
  timestamp: number
  left_hand: ProtoHandLandmarks
  right_hand: ProtoHandLandmarks
}

export interface ProtoInterpretation {
  text: string
  confidence: number
  gloss: string
}

export interface SignInterpreterClient extends grpc.Client {
  Interpret(
    request: ProtoPoseFrame,
    callback: (error: grpc.ServiceError | null, response: ProtoInterpretation) => void,
  ): grpc.ClientUnaryCall
  Interpret(
    request: ProtoPoseFrame,
    metadata: grpc.Metadata,
    callback: (error: grpc.ServiceError | null, response: ProtoInterpretation) => void,
  ): grpc.ClientUnaryCall
  Interpret(
    request: ProtoPoseFrame,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: (error: grpc.ServiceError | null, response: ProtoInterpretation) => void,
  ): grpc.ClientUnaryCall
}

let cachedClient: SignInterpreterClient | null = null

export function getSignInterpreterClient(
  address = process.env.AI_CORE_GRPC_URL || 'localhost:50051',
): SignInterpreterClient {
  if (cachedClient) return cachedClient

  const packageDefinition = protoLoader.loadSync(PROTO_PATH!, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  })

  const proto = grpc.loadPackageDefinition(packageDefinition) as any
  const ServiceCtor = proto.opensign.ai.SignInterpreter

  cachedClient = new ServiceCtor(address, grpc.credentials.createInsecure())
  return cachedClient as SignInterpreterClient
}
