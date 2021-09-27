import React, {useEffect} from 'react'
import {fireEvent, render} from '@testing-library/react'

import {useForm} from './react-hook-use-form'

describe('React Form Hooks', () => {
  it('should function as a controlled form', () => {
    let pass = false

    const Component: React.FunctionComponent = () => {
      const {bind, formBind, onSubmit, controlledInput, changed} = useForm({
        name: '',
        age: 10
      })

      onSubmit(data => {
        expect(data.name).toBe('test')
        expect(data.age).toBe(10)
        expect(changed('age')).toBe(false)
        expect(changed('name')).toBe(true)
        expect(changed()).toBe(true)
        pass = true
      })

      // This is to test Typescript.
      // `value` should have the type number
      const {value, update} = controlledInput('age')

      return (
        <form {...formBind()}>
          <input {...bind('name')} id="name" />
          <input
            value={value}
            onChange={e => {
              update(parseInt(e.target.value))
            }}
          />
          <input type="submit" value="submit" />
        </form>
      )
    }

    const {container, getByLabelText, getByText} = render(<Component />)

    expect(container).toMatchInlineSnapshot(`
      <div>
        <form>
          <input
            aria-label="name"
            id="name"
            name="name"
            value=""
          />
          <input
            value="10"
          />
          <input
            type="submit"
            value="submit"
          />
        </form>
      </div>
    `)

    const input = getByLabelText('name')

    fireEvent.change(input, {target: {value: 'test'}})

    const submitButton = getByText('submit')

    fireEvent.click(submitButton)

    expect(pass).toBe(true)
  })

  it('should validate input', () => {
    //let pass = false

    const Component = () => {
      const {formBind, bind, validate, valid} = useForm({
        name: '',
        email: ''
      })

      validate('name', value => {
        //pass = true
        return value === 'pass'
      })

      validate('email', () => {
        return true
      })

      return (
        <form {...formBind()}>
          <input {...bind('name')} />
          <input {...bind('email')} />
          <b>{valid() ? 'valid' : 'invalid'}</b>
          <i>{valid('email') ? 'valid' : 'invalid'}</i>
        </form>
      )
    }

    const {container, getByLabelText} = render(<Component />)

    expect(container).toMatchInlineSnapshot(`
      <div>
        <form>
          <input
            aria-label="name"
            id="name"
            name="name"
            value=""
          />
          <input
            aria-label="email"
            id="email"
            name="email"
            value=""
          />
          <b>
            invalid
          </b>
          <i>
            valid
          </i>
        </form>
      </div>
    `)

    const nameInput = getByLabelText('name')
    //const emailInput = getByLabelText('email')

    fireEvent.change(nameInput, {target: {value: 'pass'}})

    expect(container).toMatchInlineSnapshot(`
      <div>
        <form>
          <input
            aria-label="name"
            id="name"
            name="name"
            value="pass"
          />
          <input
            aria-label="email"
            id="email"
            name="email"
            value=""
          />
          <b>
            valid
          </b>
          <i>
            valid
          </i>
        </form>
      </div>
    `)
  })

  it('should function support set and a clear', () => {
    let pass = false
    const btnSet = 'Set'

    const Component: React.FunctionComponent = () => {
      const {bind, formBind, onSubmit, set, clear, submit} = useForm({
        name: '',
        age: 10
      })

      onSubmit(data => {
        expect(data.name).toBe('set')
        expect(data.age).toBe(10)
        pass = true
        clear()
      })

      return (
        <form {...formBind()}>
          <input {...bind('name')} />
          <button
            onClick={e => {
              e.preventDefault()
              set({name: 'set'})
            }}
          >
            {btnSet}
          </button>
          <button
            onClick={e => {
              e.preventDefault()
              submit()
            }}
          >
            submit
          </button>
        </form>
      )
    }

    const {container, getByText, getByLabelText} = render(<Component />)

    const setButton = getByText(btnSet)
    const nameInput = getByLabelText('name')
    const submitButton = getByText('submit')

    fireEvent.change(nameInput, {target: {value: 'new name'}})

    expect(container).toMatchInlineSnapshot(`
      <div>
        <form>
          <input
            aria-label="name"
            id="name"
            name="name"
            value="new name"
          />
          <button>
            Set
          </button>
          <button>
            submit
          </button>
        </form>
      </div>
    `)

    fireEvent.click(setButton)

    fireEvent.click(submitButton)

    expect(pass).toBe(true)
  })

  it('should supply set etc.. in a stable way', () => {
    const TEST_STRING = 'test'

    let runCount = 0

    const Component: React.FunctionComponent = () => {
      const {set, formBind, onSubmit, changed} = useForm({
        title: ''
      })

      useEffect(() => {
        set({
          title: TEST_STRING
        })

        runCount++
      }, [set])

      onSubmit(({title}) => {
        expect(changed('title')).toBe(true)
        expect(title).toBe(TEST_STRING)
      })

      return (
        <>
          <form {...formBind()}>
            <input type="submit" value="submit" />
          </form>
        </>
      )
    }

    const {getByText} = render(<Component />)

    const submitButton = getByText('submit')

    fireEvent.click(submitButton)

    expect(runCount).toBe(1)
  })

  it('should support `ariaModel`', () => {
    const Component: React.FunctionComponent = () => {
      const {bind, formBind, onSubmit, controlledInput, label} = useForm(
        {
          name: '',
          age: 10
        },
        {ariaModel: 'person'}
      )

      onSubmit(data => {
        expect(data.name).toBe('test')
        expect(data.age).toBe(10)
      })

      // This is to test Typescript.
      // `value` should have the type number
      const {value, update, label: controlledLabel} = controlledInput('age')

      return (
        <form {...formBind()}>
          <label {...label('name')}>Name:</label>
          <input {...bind('name')} id="name" />
          <label {...controlledLabel()}>Age:</label>
          <input
            value={value}
            onChange={e => {
              update(parseInt(e.target.value))
            }}
          />
        </form>
      )
    }

    const {getByLabelText} = render(<Component />)

    const nameInput = getByLabelText('person-name')

    expect(nameInput).not.toBeNull()
  })

  it('should allow you to have a custom onChange for controlled inputs', () => {
    let called = false
    let pass = false

    const Component: React.FC = () => {
      const {formBind, controlledInput, onSubmit} = useForm({sample: 'abc'})

      const control = controlledInput('sample', {
        onChange: (v: string[]) => {
          called = true

          return v.join('')
        },
        render: (v: string) => {
          return v.split('')
        }
      })

      onSubmit(({sample}) => {
        pass = true

        expect(sample).toBe('pass')
      })

      return (
        <form {...formBind()}>
          <input
            onChange={(e: any) => {
              // because we are coming through a input field this is a string when it shouldn't be
              control.update(e.target.value.split(','))
            }}
            aria-label="sample"
          />
          <input type="submit" value="submit" />
        </form>
      )
    }

    const {getByLabelText, getByText} = render(<Component />)

    const sampleInput = getByLabelText('sample')

    fireEvent.change(sampleInput, {target: {value: ['p', 'a', 's', 's']}})

    expect(called).toBe(true)

    const submitButton = getByText('submit')

    fireEvent.click(submitButton)

    expect(pass).toBe(true)
  })

  it('should support meta value', async () => {
    const Component: React.FC = () => {
      const {formBind, bind, meta, set} = useForm(
        {
          name: ''
        },
        {meta: {userId: 10}}
      )

      return (
        <form {...formBind()}>
          <input {...bind('name')} />
          <p>Updating user #{meta.userId}</p>
          <button
            onClick={() => {
              set({name: 'Updated'}, {userId: 20})
            }}
          >
            Update
          </button>
        </form>
      )
    }

    const {container, getByText} = render(<Component />)

    expect(container).toMatchInlineSnapshot(`
<div>
  <form>
    <input
      aria-label="name"
      id="name"
      name="name"
      value=""
    />
    <p>
      Updating user #
      10
    </p>
    <button>
      Update
    </button>
  </form>
</div>
`)

    const updateButton = getByText('Update')

    fireEvent.click(updateButton)

    expect(container).toMatchInlineSnapshot(`
<div>
  <form>
    <input
      aria-label="name"
      id="name"
      name="name"
      value="Updated"
    />
    <p>
      Updating user #
      20
    </p>
    <button>
      Update
    </button>
  </form>
</div>
`)
  })
})
