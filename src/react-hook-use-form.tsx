import {useReducer, useRef} from 'react'

export interface FormHookOutput<T> {
  /** Reset the form to its initial values */
  clear: () => void

  /**
   * Returns an object of functions to be used with an input, see `ControlledInput`
   */
  controlledInput: <K extends keyof T>(
    field: K,
    fieldOptions?: {
      onChange?: (value: any) => T[K]
    }
  ) => ControlledInput<T, K>

  /** The current data object */
  data: T

  /**
   * The function passed as a callback will be called when the form is submitted.
   *
   * @param cb Callback function that is passed the current data object when the form is submitted.
   */
  onSubmit: (cb: (data: T) => void) => void

  /**
   * Defines a validator for the form.
   *
   * @param field The field to validate.
   * @param validator The function to validate the field, should return a boolean for valid status.
   */
  validate: <K extends keyof T>(
    field: K,
    validator: (value: T[K], data: T) => boolean
  ) => void

  /**
   * Check the validation status of the form or field.
   *
   * @param field (Optional), if supplied the validation status of the given field will be returned, otherwise the whole forms status will be returned.
   */
  valid: (field?: keyof T) => boolean

  /**
   * Bind to a field, used to quickly setup `input` tags.
   *
   * For example `<input {...bind('field')} />`
   *
   * @param field The field to bind this input to.
   */
  bind: <K extends keyof T>(field: K) => ControlledInput<T, K>['bind']

  /**
   * Binds the form to `useForm`.
   *
   * Use as `<form {...formBind()}>`
   */
  formBind: () => {
    onSubmit: (e: any) => void
  }

  /**
   * Set the data to the supplied data.
   *
   * @param data The new data object to use.
   */
  set: (data: Partial<T>) => void

  /**
   * Returns the required fields for a label.
   */
  label: <K extends keyof T>(field: K) => {htmlFor: string}

  /**
   * Has the value changed from its original.
   *
   * @param field (Optional) limit search to a single field.
   */
  changed: (field?: keyof T) => boolean

  /**
   * Submit the form. Useful if you need a button outside the form to submit the value.
   *
   * _Make sure to bind the form aswell incase it is submitted by another means_
   */
  submit: () => void
}

/**
 * Interact with a single form field.
 */
export interface ControlledInput<T, K extends keyof T = keyof T> {
  /** The field controlled by these functions. */
  field: K

  /** The fields current value. */
  value: T[K]

  /** Set the fields value to the supplied value. */
  update: (newValue: T[K]) => void

  /** Is the current field value valid? */
  valid: () => boolean

  /** Bind to an input */
  bind: {
    /** The current value of the field. */
    value: T[K]

    /** THe default on change handler. Takes `e.target.value` and uses it as the new field value. */
    onChange: (e: any) => void

    /** The fields name. */
    name: K

    /** Aria label for the field. Is either the name or the name merged with the supplied `ariaModel`. */
    'aria-label': string

    /** Same as the aria label. */
    id: string
  }

  /**
   * Returns the binding for a label.
   *
   * e.g. `<label {...label('field)}>Field</label>
   */
  label: () => ReturnType<FormHookOutput<T>['label']>

  /** Aria label for the field. Is either the name or the name merged with the supplied `ariaModel`. */
  'aria-label': string
}

interface DispatchAction<T, K extends keyof T = keyof T> {
  /** The field to update. */
  field: K

  /** The value to set. */
  value: T[K]
}

export interface UseFormOptions {
  /**
   * Aria Model to use in controlled inputs.
   */
  ariaModel: string
}

/**
 * Creates and manages form state
 *
 * @param initialData The initial state of the form. Needs to have every field as a property.
 * @param options Configuration for the hook.
 * @returns State interaction functions.
 */
export function useForm<T>(
  initialData: T,
  options?: UseFormOptions
): FormHookOutput<T> {
  const [data, dispatchData] = useReducer<React.Reducer<T, DispatchAction<T>>>(
    (state, action) => {
      let newState = {...state}

      newState[action.field] = action.value

      return newState
    },
    initialData
  )

  const originalData = {...initialData}

  const staticFunctions = useRef({
    set: (data: Partial<T>) => {
      Object.keys(data).forEach(field => {
        dispatchData({field: field as keyof T, value: data[field]})
      })
    },
    clear: () => {
      Object.keys(initialData).forEach(field => {
        dispatchData({field: field as keyof T, value: initialData[field]})
      })
    }
  })

  /** The default onSubmit, this is so we can overwrite it when the user calls `onSubmit` */
  let onSubmitCallback = (data: T) => {
    // NOOP
  }

  let validators: {[field: string]: (value: any, data: T) => boolean} = {}

  Object.keys(data).forEach(key => {
    validators[key] = () => true
  })

  const controlledInput = <K extends keyof T>(
    field: K,
    fieldOptions?: {
      onChange?: (value: any) => T[K]
    }
  ): ControlledInput<T, K> => {
    const update = (value: T[K]) => {
      if (fieldOptions !== undefined && fieldOptions.onChange !== undefined) {
        value = fieldOptions.onChange(value)
      }

      dispatchData({field, value})
    }

    const valid = () => validators[field as string](data[field], data)

    const ariaLabel =
      options && options.ariaModel
        ? `${options.ariaModel}-${field}`
        : `${field}`

    return {
      field,
      value: data[field],
      update,
      valid,
      bind: {
        value: data[field],
        name: field,
        onChange: e => update((e.target as any).value),
        'aria-label': ariaLabel,
        id: ariaLabel
      },
      label: () => label(field),
      'aria-label': ariaLabel
    }
  }

  const onSubmit = (cb: (data: T) => void) => {
    onSubmitCallback = cb
  }

  const validate = (
    field: keyof T,
    validator: (value: any, data: T) => boolean
  ) => {
    validators[field as string] = validator
  }

  const valid = (field?: keyof T) => {
    if (field) {
      return validators[field as string](data[field], data)
    }

    return Object.keys(data).reduce((acc, key) => {
      return acc && validators[key]((data as any)[key] as any, data)
    }, true)
  }

  const bind = <K extends keyof T>(field: K) => {
    return controlledInput(field).bind
  }

  const label = <K extends keyof T>(field: K) => {
    const id =
      options && options.ariaModel
        ? `${options.ariaModel}-${field}`
        : `${field}`

    return {
      htmlFor: id
    }
  }

  const formBind = () => {
    return {
      onSubmit: (e: any) => {
        e.preventDefault()
        onSubmitCallback(data)
      }
    }
  }

  const submit = () => {
    onSubmitCallback(data)
  }

  const changed = (field?: keyof T): boolean => {
    if (field) {
      console.dir(originalData)

      return originalData[field] !== data[field]
    }

    return Object.keys(data).reduce((changed, field) => {
      if (changed) {
        return changed
      }

      return originalData[field] !== data[field]
    }, false)
  }

  return {
    clear: staticFunctions.current.clear,
    controlledInput,
    data,
    onSubmit,
    validate,
    valid,
    bind,
    formBind,
    set: staticFunctions.current.set,
    label,
    changed,
    submit
  }
}
