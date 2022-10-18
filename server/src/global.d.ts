declare module 'redis';

declare module 'yup' {
  // tslint:disable-next-line: interface-name
  export interface ArraySchema<T> {
    /**
		 * Allows you to define mutliple disparate types which should
		 * be considered valid within a single array. You can tell the method
		 * what types of schemas to expect by passing the schema types:
		 *
		 * ```
		 * // Array of object schemas
		 * yup.array().oneOfSchemas<yup.ObjectSchema>([
		 *     yup.object().shape({ ... })
		 * ]);
		 *
		 * // Array of object or string schemas
		 * yup.array().oneOfSchemas<yup.ObjectSchema | yup.StringSchema>([
		 *     yup.object().shape({ ... }),
		 *     yup.string()
		 * ]);
		 * ```
		 *
		 * @param schemas A list of yup schema definitions
		 * @param message The message to display when a schema is invalid
		 */
    oneOfSchemas<U>(schemas: U[], message?: TestOptionsMessage): this;
  }
}
