import axios, { AxiosError } from 'axios';
import type {
  ApiError,
  LiveSimulationStartRequest,
  LiveSimulationStartResponse,
  ProductTelemetryRecord,
  ProductTelemetryRequest,
  SimulationHistory,
  SimulationRequest,
  SimulationResponse
} from '../types/types';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

const client = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<{ detail?: string }>;
    const detail = axiosErr.response?.data?.detail as unknown;
    let message = axiosErr.message;

    if (typeof detail === 'string') {
      message = detail;
    } else if (Array.isArray(detail)) {
      const joined = detail
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'msg' in item) {
            return String((item as { msg?: unknown }).msg ?? 'Validation error');
          }
          return 'Validation error';
        })
        .join('; ');
      message = joined || message;
    } else if (detail && typeof detail === 'object') {
      message = JSON.stringify(detail);
    }

    return {
      message,
      status: axiosErr.response?.status
    };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: 'Unexpected error occurred' };
}

export async function simulate(payload: SimulationRequest): Promise<SimulationResponse> {
  try {
    const response = await client.post<SimulationResponse>('/simulate', payload);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function resetSimulation(): Promise<void> {
  try {
    await client.post('/reset');
  } catch (error) {
    throw toApiError(error);
  }
}

export async function fetchResults(): Promise<SimulationResponse[]> {
  try {
    const response = await client.get<SimulationResponse[]>('/results');
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function fetchHistory(): Promise<SimulationHistory[]> {
  try {
    const response = await client.get<SimulationHistory[]>('/history');
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function startLiveSimulation(payload: LiveSimulationStartRequest): Promise<LiveSimulationStartResponse> {
  try {
    const response = await client.post<LiveSimulationStartResponse>('/simulate/live/start', payload);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function stopLiveSimulation(sessionId: string): Promise<void> {
  try {
    await client.post(`/simulate/live/stop/${sessionId}`);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function ingestProductTelemetry(payload: ProductTelemetryRequest): Promise<void> {
  try {
    await client.post('/products/telemetry', payload);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function fetchProductTelemetry(limit = 240): Promise<ProductTelemetryRecord[]> {
  try {
    const response = await client.get<ProductTelemetryRecord[]>('/products/telemetry', { params: { limit } });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export function getLiveWebsocketUrl(sessionId: string): string {
  const url = new URL(baseURL);
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${url.host}/api/v1/ws/simulate/live/${sessionId}`;
}
