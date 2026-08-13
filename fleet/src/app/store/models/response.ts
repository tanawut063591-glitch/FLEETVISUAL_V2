export const success = {
  message: 'Success',
  statusCode: 200,
};

export const error = {
  message: 'Error',
  statusCode: 500,
};

export interface ResponseRealtime {
  Name: string;
  Value: number;
  TimeStamp: string;
}
