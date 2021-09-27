import {useReducer, useRef, useState} from 'react'

export interface FormHookOutput<Data, Meta = {}> {
  /** Reset the form to its initial values */
  clear: () => void

  /**
   * Returns an object of functions to be used with an input, see `ControlledInput`
   */
  controlledInput: <Key extends keyof Data, Render extends any = Data[Key]>(
    field: Key,
    fieldOptions?: {
      onChange?: (value: Render) => Data[Key]
      render?: (value: Data[Key]) => Render
    }
  ) => ControlledInput<Data, Key, Render>

  /** The current data object */
  data: Data

  /** Forms meta data */
  meta: Meta

  /**
   * The function passed as a callback will be called when the form is submitted.
   *
   * @param cb Callback function that is passed the current data object when the form is submitted.
   */
  onSubmit: (cb: (data: Data, meta: Meta) => void) => void

  /**
   * Defines a validator for the form.
   *
   * @param field The field to validate.
   * @param validator The function to validate the field, should return a boolean for valid status.
   */
  validate: <Key extends keyof Data>(
    field: Key,
    validator: (value: Data[Key], data: Data, meta: Meta) => boolean
  ) => void

  /**
   * Check the validation status of the form or field.
   *
   * @param field (Optional), if supplied the validation status of the given field will be returned, otherwise the whole forms status will be returned.
   */
  valid: (field?: keyof Data) => boolean

  /**
   * Bind to a field, used to quickly setup `input` tags.
   *
   * For example `<input {...bind('field')} />`
   *
   * @param field The field to bind this input to.
   */
  bind: <Key extends keyof Data>(
    field: Key
  ) => ControlledInput<Data, Key>['bind']

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
  set: (data: Partial<Data>, meta?: Partial<Meta>) => void

  /**
   * Returns the required fields for a label.
   */
  label: <Key extends keyof Data>(field: Key) => {htmlFor: string}

  /**
   * Has the value changed from its original.
   *
   * @param field (Optional) limit search to a single field.
   */
  changed: (field?: keyof Data) => boolean

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
export interface ControlledInput<
  Data,
  Key extends keyof Data = keyof Data,
  Render extends any = Data[Key]
> {
  /** The field controlled by these functions. */
  field: Key

  /** The fields current value. */
  value: Render

  /** Set the fields value to the supplied value. */
  update: (newValue: Render) => void

  /** Is the current field value valid? */
  valid: () => boolean

  /** Bind to an input */
  bind: {
    /** The current value of the field. */
    value: Render

    /** THe default on change handler. Takes `e.target.value` and uses it as the new field value. */
    onChange: (e: any) => void

    /** The fields name. */
    name: Key

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
  label: () => ReturnType<FormHookOutput<Data>['label']>

  /** Aria label for the field. Is either the name or the name merged with the supplied `ariaModel`. */
  'aria-label': string
}

interface DispatchAction<T, K extends keyof T = keyof T> {
  /** The field to update. */
  field: K

  /** The value to set. */
  value: T[K]
}

export interface UseFormOptions<Meta> {
  /**
   * Aria Model to use in controlled inputs.
   */
  ariaModel?: string
  /** Initial meta data for the form. Defines the type of the meta data. */
  meta?: Meta
}

/**
 * Creates and manages form state
 *
 * @param initialData The initial state of the form. Needs to have every field as a property.
 * @param options Configuration for the hook.
 * @returns State interaction functions.
 */
export function useForm<Data, Meta = {}>(
  initialData: Data,
  options?: UseFormOptions<Meta>
): FormHookOutput<Data, Meta> {
  const [data, dispatchData] = useReducer<
    React.Reducer<Data, DispatchAction<Data>>
  >((state, action) => {
    let newState = {...state}

    newState[action.field] = action.value

    return newState
  }, initialData)

  const originalData = {...initialData}
  const [meta, setMeta] = useState(
    options && options.meta ? options.meta : ({} as Meta)
  )

  const staticFunctions = useRef({
    set: (data: Partial<Data>, newMeta?: Partial<Meta>) => {
      Object.keys(data).forEach(field => {
        dispatchData({field: field as keyof Data, value: data[field]})
      })

      if (meta) {
        setMeta({...meta, ...newMeta})
      }
    },
    clear: () => {
      Object.keys(initialData).forEach(field => {
        dispatchData({field: field as keyof Data, value: initialData[field]})
      })
    }
  })

  /** The default onSubmit, this is so we can overwrite it when the user calls `onSubmit` */
  let onSubmitCallback = (data: Data, meta: Meta) => {
    // NOOP
  }

  let validators: {
    [field: string]: (value: any, data: Data, meta: Meta) => boolean
  } = {}

  Object.keys(data).forEach(key => {
    validators[key] = () => true
  })

  const controlledInput = <
    Key extends keyof Data,
    Render extends any = Data[Key]
  >(
    field: Key,
    fieldOptions?: {
      onChange?: (value: Render) => Data[Key]
      render?: (value: Data[Key]) => Render
    }
  ): ControlledInput<Data, Key, Render> => {
    const update = (value: Render) => {
      if (fieldOptions !== undefined && fieldOptions.onChange !== undefined) {
        dispatchData({field, value: fieldOptions.onChange(value)})
        return
      }

      dispatchData({field, value: value as Data[Key]})
    }

    const valid = () => validators[field as string](data[field], data, meta)

    const ariaLabel =
      options && options.ariaModel
        ? `${options.ariaModel}-${field}`
        : `${field}`

    const value = (
      fieldOptions && fieldOptions.render
        ? fieldOptions.render(data[field])
        : data[field]
    ) as Render

    return {
      field,
      value,
      update,
      valid,
      bind: {
        value,
        name: field,
        onChange: e => update((e.target as any).value),
        'aria-label': ariaLabel,
        id: ariaLabel
      },
      label: () => label(field),
      'aria-label': ariaLabel
    }
  }

  const onSubmit = (cb: (data: Data, meta: Meta) => void) => {
    onSubmitCallback = cb
  }

  const validate = (
    field: keyof Data,
    validator: (value: any, data: Data, meta: Meta) => boolean
  ) => {
    validators[field as string] = validator
  }

  const valid = (field?: keyof Data) => {
    if (field) {
      return validators[field as string](data[field], data, meta)
    }

    return Object.keys(data).reduce((acc, key) => {
      return acc && validators[key]((data as any)[key] as any, data, meta)
    }, true)
  }

  const bind = <Key extends keyof Data>(field: Key) => {
    return controlledInput(field).bind
  }

  const label = <Key extends keyof Data>(field: Key) => {
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
        onSubmitCallback(data, meta)
      }
    }
  }

  const submit = () => {
    onSubmitCallback(data, meta)
  }

  const changed = (field?: keyof Data): boolean => {
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
    submit,
    meta
  }
}
