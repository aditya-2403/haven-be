import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';
import { COMMON_MESSAGES } from '../constants/messages.constant';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((resData) => {
        // If the response is already in ApiResponse format, return it
        if (resData && typeof resData === 'object' && 'success' in resData) {
          return resData;
        }

        // If the controller returned an object with message / data / pagination
        if (resData && typeof resData === 'object' && ('data' in resData || 'pagination' in resData)) {
          return {
            success: true,
            message: resData.message || COMMON_MESSAGES.OPERATION_SUCCESS,
            data: resData.data,
            pagination: resData.pagination,
          };
        }

        return {
          success: true,
          message: COMMON_MESSAGES.OPERATION_SUCCESS,
          data: resData,
        };
      }),
    );
  }
}

